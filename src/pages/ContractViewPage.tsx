import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { supabase } from "../lib/supabase";
import type { Locacao } from "../types/entities";
import toast from "react-hot-toast";
import { ArrowLeft, FileDown, Printer } from "lucide-react";
import { buildContractHtml } from "../lib/contract";

export const ContractViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [locacao, setLocacao] = useState<Locacao | null>(null);
  const [companySettings, setCompanySettings] = useState<Record<string, unknown>>({});
  const [rentalSettings, setRentalSettings] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const sanitizeContractHtml = (html: string) =>
    html
      .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+="[^"]*"/gi, "")
      .replace(/\son\w+='[^']*'/gi, "")
      .replace(/javascript:/gi, "");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [{ data, error }, { data: appData }] = await Promise.all([
        supabase.from("locacoes").select("*,clientes(*),carros(*)").eq("id", id).single(),
        supabase.from("app_settings").select("company_settings,rental_settings").eq("singleton_key", "main").maybeSingle(),
      ]);
      setLoading(false);
      if (error) return toast.error(error.message);
      setLocacao(data as Locacao);
      setCompanySettings((appData?.company_settings as Record<string, unknown>) || {});
      setRentalSettings((appData?.rental_settings as Record<string, unknown>) || {});
    };
    if (id) load();
  }, [id]);

  const generatedContractHtml = useMemo(() => {
    if (!locacao) return "<p>Contrato não encontrado.</p>";
    if (!locacao.clientes || !locacao.carros) return locacao.contrato_html || "<p>Dados incompletos para gerar contrato.</p>";
    const required: Array<[string, unknown]> = [
      ["Nome da locadora", companySettings.nomeLocadora || companySettings.nomeFantasia],
      ["Nome do cliente", locacao.clientes.nome],
      ["CPF do cliente", locacao.clientes.cpf],
      ["CNH do cliente", locacao.clientes.cnh],
      ["Marca do veículo", locacao.carros.marca],
      ["Modelo do veículo", locacao.carros.modelo],
      ["Placa do veículo", locacao.carros.placa],
      ["Data de retirada", locacao.data_retirada],
      ["Data prevista de devolução", locacao.data_prevista_devolucao],
    ];
    const missing = required.filter(([, value]) => !String(value || "").trim()).map(([label]) => label);
    if (missing.length > 0) {
      return `<div style="padding:16px;border:1px solid #fecaca;background:#fef2f2;border-radius:10px;color:#7f1d1d;font-family:Inter,Arial,sans-serif;">
        <strong>Não foi possível gerar o contrato.</strong><br/>
        Preencha os seguintes dados obrigatórios: ${missing.join(", ")}.
      </div>`;
    }

    return buildContractHtml({
      contratoCodigo: `CTR-${locacao.id.slice(0, 8).toUpperCase()}`,
      locadora: {
        nome: String(companySettings.nomeLocadora || companySettings.nomeFantasia || "Locadora"),
        cpfCnpj: String(companySettings.cpfCnpj || ""),
        endereco: String(companySettings.endereco || ""),
        telefone: String(companySettings.telefone || ""),
        cidadeUf: `${String(companySettings.cidade || "")}${companySettings.estado ? `/${String(companySettings.estado)}` : ""}`,
        logoUrl: String(companySettings.logoUrl || ""),
      },
      cliente: {
        nome: locacao.clientes.nome,
        cpf: locacao.clientes.cpf,
        cnh: locacao.clientes.cnh,
        telefone: locacao.clientes.telefone || "",
        endereco: locacao.clientes.endereco || "",
      },
      veiculo: {
        marca: locacao.carros.marca,
        modelo: locacao.carros.modelo,
        placa: locacao.carros.placa,
        ano: locacao.carros.ano,
        cor: locacao.carros.cor,
        kmSaida: locacao.km_saida,
        valorDiaria: locacao.valor_diaria,
      },
      locacao: {
        dataRetirada: locacao.data_retirada,
        dataPrevistaDevolucao: locacao.data_prevista_devolucao,
        quantidadeDiarias: locacao.quantidade_diarias,
        valorPrevisto: locacao.valor_previsto ?? locacao.valor_total,
        status: locacao.status,
        dataDevolucaoReal: locacao.data_devolucao_real,
        kmDevolucao: locacao.km_devolucao ?? locacao.km_entrada,
        kmRodadoReal: locacao.km_rodado_real ?? locacao.km_rodado,
        diasExtras: locacao.dias_extras ?? 0,
        valorAdicional: locacao.valor_adicional ?? 0,
        valorFinal: locacao.valor_final ?? locacao.valor_total,
        observacaoDevolucao: locacao.observacao_devolucao || locacao.observacoes_devolucao,
        observacoesContrato: locacao.contrato_observacoes || "",
      },
      regras: {
        limiteKm: rentalSettings.kmLivre as string | number | null,
        valorKmExcedente: Number(rentalSettings.valorKmExcedente || 0),
        cidadeForo: `${String(companySettings.cidade || "")}${companySettings.estado ? `/${String(companySettings.estado)}` : ""}`,
      },
      testemunhas: {
        nome1: locacao.testemunha1_nome || "",
        cpf1: locacao.testemunha1_cpf || "",
        nome2: locacao.testemunha2_nome || "",
        cpf2: locacao.testemunha2_cpf || "",
      },
    });
  }, [locacao, companySettings, rentalSettings]);

  return (
    <div className="space-y-4">
      <Card className="no-print p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Contrato de locação</p>
            <h2 className="text-xl font-bold text-slate-900">Visualização do Contrato</h2>
            <p className="text-sm text-slate-500">Documento oficial da locadora pronto para leitura e impressão.</p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => navigate(-1)}><ArrowLeft size={15} className="mr-1" /> Voltar</Button>
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => window.print()}><FileDown size={15} className="mr-1" /> Baixar PDF</Button>
            <Button className="w-full sm:w-auto" variant="secondary" onClick={() => window.print()}><Printer size={15} className="mr-1" /> Imprimir</Button>
          </div>
        </div>
      </Card>

      <Card className="print-container border-slate-300 bg-slate-50/50 p-3 sm:p-6 md:p-8">
        <div className="contract-doc-shell mx-auto max-w-[900px]">
          {loading ? (
            <p className="text-sm text-slate-500">Carregando contrato...</p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: sanitizeContractHtml(generatedContractHtml) }} />
          )}
        </div>
      </Card>
    </div>
  );
};
