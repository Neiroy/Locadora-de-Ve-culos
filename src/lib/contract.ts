import { formatCurrencyBRL, formatDate, formatDateTime } from "./format";
import { DEFAULT_BRAND_LOGO_URL, DEFAULT_BRAND_NAME, normalizeLogoUrl } from "./branding";

export interface ContractInput {
  contratoCodigo: string;
  locadora: {
    nome: string;
    cpfCnpj?: string | null;
    endereco?: string | null;
    telefone?: string | null;
    cidadeUf?: string | null;
    logoUrl?: string | null;
  };
  cliente: {
    nome: string;
    cpf: string;
    cnh: string;
    telefone?: string | null;
    endereco?: string | null;
  };
  veiculo: {
    marca: string;
    modelo: string;
    placa: string;
    ano: number;
    cor?: string | null;
    kmSaida: number;
    valorDiaria: number;
  };
  locacao: {
    dataRetirada: string;
    dataPrevistaDevolucao: string;
    quantidadeDiarias: number;
    valorPrevisto: number;
    status: string;
    dataDevolucaoReal?: string | null;
    kmDevolucao?: number | null;
    kmRodadoReal?: number | null;
    diasExtras?: number | null;
    valorAdicional?: number | null;
    valorFinal?: number | null;
    observacaoDevolucao?: string | null;
    observacoesContrato?: string | null;
  };
  regras: {
    limiteKm?: string | number | null;
    valorKmExcedente?: number | null;
    cidadeForo?: string | null;
  };
  testemunhas?: {
    nome1?: string | null;
    cpf1?: string | null;
    nome2?: string | null;
    cpf2?: string | null;
  };
}

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const pct = (v?: string | null) => (v && v.trim() ? escapeHtml(v) : "Não informado");

export const buildContractHtml = (input: ContractInput) => {
  const logoUrl = normalizeLogoUrl(input.locadora.logoUrl) || DEFAULT_BRAND_LOGO_URL;
  const valorFinal = input.locacao.valorFinal ?? input.locacao.valorPrevisto;
  const valorAdicional = input.locacao.valorAdicional ?? 0;
  const diasExtras = input.locacao.diasExtras ?? 0;
  const kmDevolucao = input.locacao.kmDevolucao ?? "-";
  const kmRodado = input.locacao.kmRodadoReal ?? "-";
  const cidadeForo = input.regras.cidadeForo || input.locadora.cidadeUf || "Cidade/UF";
  const limiteKm = input.regras.limiteKm ?? "";
  const valorKmExcedente = input.regras.valorKmExcedente ?? 0;
  const emissao = formatDateTime(new Date().toISOString());

  return `
  <article class="print-container contract-sheet" style="max-width:850px;margin:0 auto;background:#fff;padding:28px;border:1px solid #dbe3ef;border-radius:12px;font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.55;">
    <header style="border-bottom:1px solid #cbd5e1;padding-bottom:12px;margin-bottom:18px;">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
        <div style="display:flex;gap:10px;align-items:center;">
          ${logoUrl ? `<img src="${logoUrl}" alt="Logo da locadora" style="height:42px;width:42px;border-radius:8px;object-fit:cover;" />` : ""}
          <div>
            <p style="margin:0;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;">Locadora</p>
            <strong style="font-size:16px;">${escapeHtml(input.locadora.nome || DEFAULT_BRAND_NAME)}</strong>
          </div>
        </div>
        <div style="text-align:right;font-size:12px;color:#475569;">
          <p style="margin:0;"><strong>Contrato:</strong> ${escapeHtml(input.contratoCodigo)}</p>
          <p style="margin:3px 0 0;"><strong>Emissão:</strong> ${escapeHtml(emissao)}</p>
          <p style="margin:3px 0 0;"><strong>Status:</strong> ${escapeHtml(input.locacao.status)}</p>
        </div>
      </div>
      <h1 style="text-align:center;font-size:22px;margin:14px 0 0;">CONTRATO DE LOCAÇÃO DE VEÍCULO</h1>
    </header>

    <section style="font-size:14px;margin-bottom:16px;">
      <p style="margin:0 0 8px;"><strong>LOCADORA:</strong> ${escapeHtml(input.locadora.nome)}, inscrita no CPF/CNPJ sob nº ${pct(input.locadora.cpfCnpj)}, com sede em ${pct(input.locadora.endereco)}, telefone ${pct(input.locadora.telefone)}, cidade/UF ${pct(input.locadora.cidadeUf)}, neste ato denominada simplesmente LOCADORA.</p>
      <p style="margin:0;"><strong>LOCATÁRIO:</strong> ${escapeHtml(input.cliente.nome)}, inscrito no CPF sob nº ${escapeHtml(input.cliente.cpf)}, portador da CNH nº ${escapeHtml(input.cliente.cnh)}, telefone ${pct(input.cliente.telefone)}, residente e domiciliado em ${pct(input.cliente.endereco)}, doravante denominado LOCATÁRIO.</p>
    </section>

    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">1. DO OBJETO DO CONTRATO</h3>
      <p style="margin:0 0 6px;font-size:14px;">A LOCADORA entrega ao LOCATÁRIO, em regime de locação temporária, o veículo abaixo descrito:</p>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 14px;font-size:13px;">
        <p style="margin:0;"><strong>Marca:</strong> ${escapeHtml(input.veiculo.marca)}</p>
        <p style="margin:0;"><strong>Modelo:</strong> ${escapeHtml(input.veiculo.modelo)}</p>
        <p style="margin:0;"><strong>Placa:</strong> ${escapeHtml(input.veiculo.placa)}</p>
        <p style="margin:0;"><strong>Ano:</strong> ${escapeHtml(input.veiculo.ano)}</p>
        <p style="margin:0;"><strong>Cor:</strong> ${pct(input.veiculo.cor)}</p>
        <p style="margin:0;"><strong>KM de saída:</strong> ${escapeHtml(input.veiculo.kmSaida)} km</p>
        <p style="margin:0;"><strong>Valor da diária:</strong> ${escapeHtml(formatCurrencyBRL(input.veiculo.valorDiaria))}</p>
      </div>
    </section>

    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">2. DO PRAZO DA LOCAÇÃO</h3>
      <p style="margin:0;font-size:14px;">Data e hora de retirada: <strong>${escapeHtml(formatDateTime(input.locacao.dataRetirada))}</strong><br/>Data e hora prevista para devolução: <strong>${escapeHtml(formatDateTime(input.locacao.dataPrevistaDevolucao))}</strong></p>
    </section>

    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">3. DO VALOR DA LOCAÇÃO</h3>
      <p style="margin:0;font-size:14px;">Quantidade de diárias contratadas: <strong>${escapeHtml(input.locacao.quantidadeDiarias)}</strong><br/>Valor da diária: <strong>${escapeHtml(formatCurrencyBRL(input.veiculo.valorDiaria))}</strong><br/>Valor previsto da locação: <strong>${escapeHtml(formatCurrencyBRL(input.locacao.valorPrevisto))}</strong></p>
    </section>

    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">4. DA DEVOLUÇÃO DO VEÍCULO</h3>
      <p style="margin:0;font-size:14px;">Data e hora real da devolução: <strong>${input.locacao.dataDevolucaoReal ? escapeHtml(formatDateTime(input.locacao.dataDevolucaoReal)) : "Ainda não finalizada"}</strong><br/>KM de devolução: <strong>${escapeHtml(kmDevolucao)}</strong><br/>KM total rodado: <strong>${escapeHtml(kmRodado)}</strong><br/>Observações da devolução: <strong>${pct(input.locacao.observacaoDevolucao)}</strong></p>
    </section>

    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">5. DA REGRA DE DIÁRIAS EXTRAS POR ATRASO NA DEVOLUÇÃO</h3>
      <p style="margin:0;font-size:14px;">A LOCADORA concede tolerância de até 2 horas após o horário previsto para devolução. Ultrapassada essa tolerância, será cobrada diária extra com arredondamento para cima conforme as regras contratuais.</p>
    </section>

    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">6. DA FÓRMULA DE CÁLCULO DA DIFERENÇA A COBRAR</h3>
      <p style="margin:0;font-size:14px;">Se atraso ≤ 2h: diárias extras = 0. Se atraso &gt; 2h: diárias extras = arredondamento para cima de (horas de atraso / 24).<br/>Valor adicional = diárias extras x valor da diária.<br/>Valor final = valor previsto + valor adicional.<br/>Diferença a cobrar = valor adicional.</p>
    </section>

    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">7. DEMONSTRATIVO DO FECHAMENTO</h3>
      <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px 14px;font-size:13px;">
        <p style="margin:0;"><strong>Diárias extras:</strong> ${escapeHtml(diasExtras)}</p>
        <p style="margin:0;"><strong>Valor adicional:</strong> ${escapeHtml(formatCurrencyBRL(valorAdicional))}</p>
        <p style="margin:0;"><strong>Valor final da locação:</strong> ${escapeHtml(formatCurrencyBRL(valorFinal))}</p>
        <p style="margin:0;"><strong>Diferença a cobrar:</strong> ${escapeHtml(formatCurrencyBRL(valorAdicional))}</p>
      </div>
      ${input.locacao.observacoesContrato ? `<p style="margin:8px 0 0;font-size:13px;"><strong>Observações adicionais:</strong> ${escapeHtml(input.locacao.observacoesContrato)}</p>` : ""}
    </section>

    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">8. DA PRORROGAÇÃO DA LOCAÇÃO</h3><p style="margin:0;font-size:14px;">A prorrogação depende de autorização prévia da LOCADORA e disponibilidade do veículo. A ausência de comunicação não impede cobrança de diárias extras.</p></section>
    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">9. DO PAGAMENTO DA DIFERENÇA NA DEVOLUÇÃO</h3><p style="margin:0;font-size:14px;">Havendo valores adicionais por atraso, danos, multas, combustível, lavagem, quilometragem excedente ou outras cobranças, o LOCATÁRIO deverá quitar no ato da devolução.</p></section>
    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">10. DAS RESPONSABILIDADES DO LOCATÁRIO</h3><p style="margin:0;font-size:14px;">O LOCATÁRIO se compromete a utilizar o veículo de forma lícita e prudente, respeitar a legislação de trânsito, não ceder a terceiros não autorizados e arcar com encargos incidentes durante a locação.</p></section>
    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">11. DAS MULTAS DE TRÂNSITO</h3><p style="margin:0;font-size:14px;">Multas, infrações e encargos decorrentes do uso durante a locação são de responsabilidade do LOCATÁRIO, inclusive recebidas após encerramento.</p></section>
    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">12. DOS DANOS AO VEÍCULO</h3><p style="margin:0;font-size:14px;">Danos e avarias por mau uso poderão ser cobrados mediante comprovação idônea.</p></section>
    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">13. DO COMBUSTÍVEL</h3><p style="margin:0;font-size:14px;">O veículo deve ser devolvido com nível equivalente ao da retirada, sob pena de cobrança complementar.</p></section>
    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">14. DA QUILOMETRAGEM</h3><p style="margin:0;font-size:14px;">Limite contratado: <strong>${limiteKm ? escapeHtml(limiteKm) : "Uso livre"}</strong><br/>Valor por KM excedente: <strong>${escapeHtml(formatCurrencyBRL(Number(valorKmExcedente || 0)))}</strong></p></section>
    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">15. DA PROTEÇÃO DE DADOS PESSOAIS</h3><p style="margin:0;font-size:14px;">Os dados pessoais serão tratados para execução deste contrato, obrigações legais e controles operacionais, conforme legislação brasileira aplicável.</p></section>
    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">16. DA CIÊNCIA E ACEITE DAS CONDIÇÕES</h3><p style="margin:0;font-size:14px;">O LOCATÁRIO declara ciência das regras de devolução, tolerância de 2h e cobrança de diárias extras, bem como possíveis diferenças entre valor previsto e valor final.</p></section>
    <section style="margin-bottom:14px;"><h3 style="font-size:15px;margin:0 0 6px;">17. DO FORO</h3><p style="margin:0;font-size:14px;">As partes elegem o foro da comarca de <strong>${escapeHtml(cidadeForo)}</strong> para dirimir eventuais conflitos.</p></section>

    <p style="margin:18px 0 14px;font-size:14px;">${escapeHtml(cidadeForo)}, ${escapeHtml(formatDate(new Date().toISOString()))}</p>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:24px;font-size:13px;">
      <div>
        <p style="margin:0 0 32px;border-top:1px solid #334155;padding-top:8px;"><strong>LOCADORA</strong><br/>Nome: __________________________________<br/>CPF/CNPJ: ______________________________<br/>Assinatura: _____________________________</p>
      </div>
      <div>
        <p style="margin:0 0 32px;border-top:1px solid #334155;padding-top:8px;"><strong>LOCATÁRIO</strong><br/>Nome: __________________________________<br/>CPF: ___________________________________<br/>CNH: ___________________________________<br/>Assinatura: _____________________________</p>
      </div>
      <div>
        <p style="margin:0;border-top:1px solid #334155;padding-top:8px;"><strong>TESTEMUNHA 1</strong><br/>Nome: ${pct(input.testemunhas?.nome1)}<br/>CPF: ${pct(input.testemunhas?.cpf1)}<br/>Assinatura: _____________________________</p>
      </div>
      <div>
        <p style="margin:0;border-top:1px solid #334155;padding-top:8px;"><strong>TESTEMUNHA 2</strong><br/>Nome: ${pct(input.testemunhas?.nome2)}<br/>CPF: ${pct(input.testemunhas?.cpf2)}<br/>Assinatura: _____________________________</p>
      </div>
    </div>

    <footer style="margin-top:18px;border-top:1px solid #e2e8f0;padding-top:8px;font-size:12px;color:#64748b;text-align:center;">
      ${escapeHtml(input.locadora.nome)} | ${pct(input.locadora.telefone)} | Emissão: ${escapeHtml(emissao)}
    </footer>
  </article>`;
};
