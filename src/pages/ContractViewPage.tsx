import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card } from "../components/ui";
import { supabase } from "../lib/supabase";
import type { Locacao } from "../types/entities";
import toast from "react-hot-toast";
import { ArrowLeft, Eye, FileDown, Printer } from "lucide-react";
import { useBranding } from "../hooks/useBranding";

export const ContractViewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { nomeLocadora, logoUrl } = useBranding();
  const [locacao, setLocacao] = useState<Locacao | null>(null);
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
      const { data, error } = await supabase.from("locacoes").select("*").eq("id", id).single();
      setLoading(false);
      if (error) return toast.error(error.message);
      setLocacao(data as Locacao);
    };
    if (id) load();
  }, [id]);

  return (
    <div className="space-y-4">
      <Card className="no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Contrato de locação</p>
            <h2 className="text-xl font-bold text-slate-900">Visualização do Contrato</h2>
            <p className="text-sm text-slate-500">Documento oficial da locadora pronto para leitura e impressão.</p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              {logoUrl && <img src={logoUrl} alt="Logo da locadora" className="h-6 w-6 rounded object-cover" />}
              <span className="text-sm font-semibold text-slate-700">{nomeLocadora}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft size={15} className="mr-1" /> Voltar</Button>
            <Button variant="outline"><Eye size={15} className="mr-1" /> Visualizar</Button>
            <Button variant="outline" onClick={() => window.print()}><FileDown size={15} className="mr-1" /> Baixar PDF</Button>
            <Button variant="secondary" onClick={() => window.print()}><Printer size={15} className="mr-1" /> Imprimir</Button>
          </div>
        </div>
      </Card>

      <Card className="print-container border-slate-300 bg-slate-50/50 p-6 md:p-8">
        <div className="contract-doc-shell mx-auto max-w-[900px]">
          {loading ? (
            <p className="text-sm text-slate-500">Carregando contrato...</p>
          ) : (
            <div dangerouslySetInnerHTML={{ __html: sanitizeContractHtml(locacao?.contrato_html || "<p>Contrato não encontrado.</p>") }} />
          )}
        </div>
      </Card>
    </div>
  );
};
