import { formatCurrencyBRL, formatDate } from "./format";
import type { Carro, Cliente } from "../types/entities";
import { DEFAULT_BRAND_LOGO_URL, DEFAULT_BRAND_NAME, normalizeLogoUrl } from "./branding";

interface ContractInput {
  cliente: Pick<Cliente, "nome" | "cpf" | "cnh" | "telefone">;
  carro: Pick<Carro, "marca" | "modelo" | "placa" | "ano" | "cor">;
  kmSaida: number;
  dataRetirada: string;
  dataPrevistaDevolucao: string;
  quantidadeDiarias: number;
  valorDiaria: number;
  valorTotal: number;
  locadoraNome?: string;
  logoUrl?: string;
  contratoCodigo?: string;
  statusLocacao?: string;
  observacoes?: string;
}

export const buildContractHtml = (input: ContractInput) => {
  const escapeHtml = (value: unknown) =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const locadoraNome = escapeHtml(input.locadoraNome || DEFAULT_BRAND_NAME);
  const logoUrl = normalizeLogoUrl(input.logoUrl) || DEFAULT_BRAND_LOGO_URL;
  const contratoCodigo = escapeHtml(input.contratoCodigo || `CTR-${Date.now().toString().slice(-8)}`);
  const statusLocacao = escapeHtml(input.statusLocacao || "aberta");
  const clienteNome = escapeHtml(input.cliente.nome);
  const clienteCpf = escapeHtml(input.cliente.cpf);
  const clienteCnh = escapeHtml(input.cliente.cnh);
  const clienteTelefone = escapeHtml(input.cliente.telefone || "-");
  const carroDescricao = `${escapeHtml(input.carro.marca)} ${escapeHtml(input.carro.modelo)}`.trim();
  const carroPlaca = escapeHtml(input.carro.placa);
  const carroAno = escapeHtml(input.carro.ano);
  const carroCor = escapeHtml(input.carro.cor || "-");
  const observacoes = input.observacoes ? escapeHtml(input.observacoes) : "";
  const kmSaida = escapeHtml(input.kmSaida);
  const dataRetirada = escapeHtml(formatDate(input.dataRetirada));
  const dataPrevista = escapeHtml(formatDate(input.dataPrevistaDevolucao));
  const quantidadeDiarias = escapeHtml(input.quantidadeDiarias);
  const valorDiaria = escapeHtml(formatCurrencyBRL(input.valorDiaria));
  const valorTotal = escapeHtml(formatCurrencyBRL(input.valorTotal));
  const emissao = escapeHtml(formatDate(new Date().toISOString()));

  return `
  <article class="print-container contract-sheet" style="max-width:860px;margin:0 auto;background:#fff;padding:34px;border:1px solid #dbe3ef;border-radius:12px;font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.5;">
    <header style="margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #0f172a;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
        <div>
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo da locadora" style="height:40px;width:40px;border-radius:8px;object-fit:cover;display:block;margin-bottom:8px;" />` : ""}
          <p style="margin:0;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b;">Locadora</p>
          <h1 style="margin:4px 0 0 0;font-size:22px;line-height:1.2;">${locadoraNome}</h1>
        </div>
        <div style="text-align:right;font-size:12px;color:#334155;">
          <p style="margin:0;"><strong>Contrato:</strong> ${contratoCodigo}</p>
          <p style="margin:4px 0 0 0;"><strong>Emissão:</strong> ${emissao}</p>
          <p style="margin:4px 0 0 0;"><strong>Status:</strong> ${statusLocacao}</p>
        </div>
      </div>
      <h2 style="margin:16px 0 0 0;font-size:20px;text-align:center;letter-spacing:.03em;">CONTRATO DE LOCAÇÃO DE VEÍCULO</h2>
    </header>

    <section style="border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:12px;">
      <h3 style="margin:0 0 10px 0;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#1e3a8a;">Dados do Cliente</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 16px;font-size:14px;">
        <p style="margin:0;"><span style="color:#64748b;">Nome:</span><br/><strong>${clienteNome}</strong></p>
        <p style="margin:0;"><span style="color:#64748b;">CPF:</span><br/><strong>${clienteCpf}</strong></p>
        <p style="margin:0;"><span style="color:#64748b;">CNH:</span><br/><strong>${clienteCnh}</strong></p>
        <p style="margin:0;"><span style="color:#64748b;">Telefone:</span><br/><strong>${clienteTelefone}</strong></p>
      </div>
    </section>

    <section style="border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:12px;">
      <h3 style="margin:0 0 10px 0;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#1e3a8a;">Dados do Veículo</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 16px;font-size:14px;">
        <p style="margin:0;"><span style="color:#64748b;">Veículo:</span><br/><strong>${carroDescricao}</strong></p>
        <p style="margin:0;"><span style="color:#64748b;">Placa:</span><br/><strong>${carroPlaca}</strong></p>
        <p style="margin:0;"><span style="color:#64748b;">Ano:</span><br/><strong>${carroAno}</strong></p>
        <p style="margin:0;"><span style="color:#64748b;">Cor:</span><br/><strong>${carroCor}</strong></p>
        <p style="margin:0;"><span style="color:#64748b;">KM de saída:</span><br/><strong>${kmSaida} km</strong></p>
      </div>
    </section>

    <section style="border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:12px;">
      <h3 style="margin:0 0 10px 0;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#1e3a8a;">Dados da Locação</h3>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 16px;font-size:14px;">
        <p style="margin:0;"><span style="color:#64748b;">Data de retirada:</span><br/><strong>${dataRetirada}</strong></p>
        <p style="margin:0;"><span style="color:#64748b;">Devolução prevista:</span><br/><strong>${dataPrevista}</strong></p>
        <p style="margin:0;"><span style="color:#64748b;">Qtd. diárias:</span><br/><strong>${quantidadeDiarias}</strong></p>
        <p style="margin:0;"><span style="color:#64748b;">Valor diária:</span><br/><strong>${valorDiaria}</strong></p>
        <p style="margin:0;grid-column:span 2;"><span style="color:#64748b;">Valor total:</span><br/><strong style="font-size:18px;color:#0f172a;">${valorTotal}</strong></p>
      </div>
    </section>

    <section style="border:1px solid #e2e8f0;border-radius:10px;padding:14px;margin-bottom:12px;">
      <h3 style="margin:0 0 10px 0;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#1e3a8a;">Termos do Contrato</h3>
      <p style="margin:0;font-size:14px;line-height:1.7;color:#1f2937;">
        Pelo presente instrumento particular, de um lado a LOCADORA e, de outro lado, o CLIENTE acima identificado, têm entre si justo e contratado a locação do veículo descrito neste documento, mediante as condições aqui estabelecidas.
      </p>
      <p style="margin:10px 0 0 0;font-size:14px;line-height:1.7;color:#1f2937;">
        O CLIENTE declara receber o veículo em perfeitas condições de uso, comprometendo-se a devolvê-lo na data ajustada, responsabilizando-se por danos, multas, uso indevido e demais responsabilidades previstas na legislação aplicável.
      </p>
      ${observacoes ? `<p style="margin:10px 0 0 0;font-size:13px;color:#334155;"><strong>Observações:</strong> ${observacoes}</p>` : ""}
    </section>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-top:58px;">
      <div style="padding-top:34px;border-top:1px solid #334155;text-align:center;min-height:70px;">
        <p style="margin:0;font-size:13px;font-weight:600;">Assinatura do Cliente</p>
      </div>
      <div style="padding-top:34px;border-top:1px solid #334155;text-align:center;min-height:70px;">
        <p style="margin:0;font-size:13px;font-weight:600;">Assinatura da Locadora</p>
      </div>
    </div>
  </article>`;
};
