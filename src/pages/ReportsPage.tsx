import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, EmptyState, Input, Label, Modal, SectionTitle, Select } from "../components/ui";
import { supabase } from "../lib/supabase";
import { formatCurrencyBRL, formatDate, formatDateTime, formatKm, maskCnh, maskCpf, maskPhone, maskPlate } from "../lib/format";
import type { Locacao, RentalStatus } from "../types/entities";
import { CalendarDays, Car, CircleDollarSign, FileSearch, Printer, ReceiptText } from "lucide-react";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

type HistoryStatusFilter = "" | "finalizada" | "cancelada";

type HistoryFilters = {
  client: string;
  vehicle: string;
  startDate: string;
  endDate: string;
  status: HistoryStatusFilter;
  paymentMethod: string;
};

const DEFAULT_FILTERS: HistoryFilters = {
  client: "",
  vehicle: "",
  startDate: "",
  endDate: "",
  status: "finalizada",
  paymentMethod: "",
};

type SummaryRow = Pick<Locacao, "valor_total" | "valor_previsto" | "valor_adicional" | "km_saida" | "km_entrada" | "km_rodado">;

const toKmDriven = (row: Pick<Locacao, "km_saida" | "km_entrada" | "km_rodado">) => {
  if (row.km_rodado !== null && row.km_rodado !== undefined) return row.km_rodado;
  if (row.km_entrada !== null && row.km_entrada !== undefined) return Math.max(row.km_entrada - row.km_saida, 0);
  return 0;
};

const toCsvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export const ReportsPage = () => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Locacao[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState({ total: 0, totalReceived: 0, totalPlanned: 0, totalAdditional: 0, totalKm: 0, averageTicket: 0 });
  const [filters, setFilters] = useState<HistoryFilters>(DEFAULT_FILTERS);
  const [selected, setSelected] = useState<Locacao | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const debouncedClient = useDebouncedValue(filters.client, 300);
  const debouncedVehicle = useDebouncedValue(filters.vehicle, 300);

  const loadHistory = async (page = currentPage) => {
    setLoading(true);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("locacoes")
      .select("*,clientes!inner(*),carros!inner(*)", { count: "exact" })
      .in("status", ["finalizada", "cancelada"])
      .range(from, to)
      .order("data_devolucao_real", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.startDate) query = query.gte("data_devolucao_real", `${filters.startDate}T00:00:00`);
    if (filters.endDate) query = query.lte("data_devolucao_real", `${filters.endDate}T23:59:59`);
    if (debouncedClient.trim()) query = query.ilike("clientes.nome", `%${debouncedClient.trim()}%`);
    if (debouncedVehicle.trim()) {
      const term = debouncedVehicle.trim();
      query = query.or(`marca.ilike.%${term}%,modelo.ilike.%${term}%,placa.ilike.%${term}%`, { foreignTable: "carros" });
    }

    const { data, error, count } = await query;
    setLoading(false);
    if (error) {
      setItems([]);
      setTotalItems(0);
      return;
    }

    setItems((data as Locacao[]) || []);
    setTotalItems(count || 0);
  };

  const loadSummary = async () => {
    let query = supabase
      .from("locacoes")
      .select("valor_total,valor_previsto,valor_adicional,km_saida,km_entrada,km_rodado,clientes!inner(nome),carros!inner(placa)")
      .in("status", ["finalizada", "cancelada"]);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.startDate) query = query.gte("data_devolucao_real", `${filters.startDate}T00:00:00`);
    if (filters.endDate) query = query.lte("data_devolucao_real", `${filters.endDate}T23:59:59`);
    if (debouncedClient.trim()) query = query.ilike("clientes.nome", `%${debouncedClient.trim()}%`);
    if (debouncedVehicle.trim()) {
      const term = debouncedVehicle.trim();
      query = query.or(`marca.ilike.%${term}%,modelo.ilike.%${term}%,placa.ilike.%${term}%`, { foreignTable: "carros" });
    }

    const { data } = await query;
    const rows = (data as SummaryRow[]) || [];
    const total = rows.length;
    const totalReceived = rows.reduce((acc, row) => acc + (row.valor_total || 0), 0);
    const totalPlanned = rows.reduce((acc, row) => acc + Number((row as Locacao).valor_previsto || (row as Locacao).valor_total || 0), 0);
    const totalAdditional = rows.reduce((acc, row) => acc + Number((row as Locacao).valor_adicional || 0), 0);
    const totalKm = rows.reduce((acc, row) => acc + toKmDriven(row), 0);
    const averageTicket = total > 0 ? totalReceived / total : 0;
    setSummary({ total, totalReceived, totalPlanned, totalAdditional, totalKm, averageTicket });
  };

  useEffect(() => {
    void loadHistory(1);
    void loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedClient, debouncedVehicle, filters.startDate, filters.endDate, filters.status, filters.paymentMethod]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  useEffect(() => {
    void loadHistory(currentPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const summaryCards = useMemo(() => summary, [summary]);

  const exportCsv = async () => {
    let query = supabase
      .from("locacoes")
      .select("*,clientes!inner(*),carros!inner(*)")
      .in("status", ["finalizada", "cancelada"])
      .order("data_devolucao_real", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.startDate) query = query.gte("data_devolucao_real", `${filters.startDate}T00:00:00`);
    if (filters.endDate) query = query.lte("data_devolucao_real", `${filters.endDate}T23:59:59`);
    if (debouncedClient.trim()) query = query.ilike("clientes.nome", `%${debouncedClient.trim()}%`);
    if (debouncedVehicle.trim()) {
      const term = debouncedVehicle.trim();
      query = query.or(`marca.ilike.%${term}%,modelo.ilike.%${term}%,placa.ilike.%${term}%`, { foreignTable: "carros" });
    }

    const { data } = await query;
    const rowsForExport = (data as Locacao[]) || [];
    if (!rowsForExport.length) return;

    const headers = [
      "ID",
      "Cliente",
      "Veiculo",
      "Placa",
      "Diaria",
      "Qtd Diarias",
      "Valor Previsto",
      "Valor Adicional",
      "Valor Final",
      "Retirada",
      "Prevista",
      "Devolucao",
      "Km Saida",
      "Km Devolucao",
      "Km Rodado",
      "Status",
    ];
    const rows = rowsForExport.map((row) => [
      row.id.slice(0, 8),
      row.clientes?.nome || "-",
      `${row.carros?.marca || ""} ${row.carros?.modelo || ""}`.trim(),
      row.carros?.placa || "-",
      formatCurrencyBRL(row.valor_diaria || 0),
      row.quantidade_diarias || 0,
      formatCurrencyBRL(row.valor_previsto || row.valor_total || 0),
      formatCurrencyBRL(row.valor_adicional || 0),
      formatCurrencyBRL(row.valor_final || row.valor_total || 0),
      formatDateTime(row.data_retirada),
      formatDateTime(row.data_prevista_devolucao),
      formatDateTime(row.data_devolucao_real),
      row.km_saida || 0,
      row.km_entrada ?? "-",
      toKmDriven(row),
      row.status,
    ]);

    const csv = [headers, ...rows].map((line) => line.map((cell) => toCsvCell(cell)).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `historicos-locacoes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <Card className="border-slate-200/90">
        <SectionTitle
          title="Históricos"
          subtitle="Consulte os fechamentos das locações, valores pagos e quilometragem rodada"
        />
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card className="min-h-[130px]">
          <div className="mb-3 flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Locações finalizadas</p>
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 ring-1 ring-blue-100"><ReceiptText size={16} /></div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900">{summaryCards.total}</p>
        </Card>

        <Card className="min-h-[130px]">
          <div className="mb-3 flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor recebido</p>
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100"><CircleDollarSign size={16} /></div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900">{formatCurrencyBRL(summaryCards.totalReceived)}</p>
        </Card>
        <Card className="min-h-[130px]">
          <div className="mb-3 flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor adicional</p>
            <div className="rounded-xl bg-violet-50 p-2 text-violet-600 ring-1 ring-violet-100"><CircleDollarSign size={16} /></div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900">{formatCurrencyBRL(summaryCards.totalAdditional)}</p>
        </Card>

        <Card className="min-h-[130px]">
          <div className="mb-3 flex items-start justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ticket médio</p>
            <div className="rounded-xl bg-amber-50 p-2 text-amber-600 ring-1 ring-amber-100"><FileSearch size={16} /></div>
          </div>
          <p className="text-3xl font-bold tracking-tight text-slate-900">{formatCurrencyBRL(summaryCards.averageTicket)}</p>
        </Card>
      </div>

      <Card className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div>
            <Label>Buscar cliente</Label>
            <Input
              placeholder="Nome do cliente"
              value={filters.client}
              onChange={(e) => setFilters((prev) => ({ ...prev, client: e.target.value }))}
            />
          </div>
          <div>
            <Label>Buscar veículo/placa</Label>
            <Input
              placeholder="Marca, modelo ou placa"
              value={filters.vehicle}
              onChange={(e) => setFilters((prev) => ({ ...prev, vehicle: e.target.value }))}
            />
          </div>
          <div>
            <Label>Período inicial</Label>
            <Input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            />
          </div>
          <div>
            <Label>Período final</Label>
            <Input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            />
          </div>
          <div>
            <Label>Status</Label>
            <Select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value as HistoryStatusFilter }))}
            >
              <option value="">Todos</option>
              <option value="finalizada">Finalizada</option>
              <option value="cancelada">Cancelada</option>
            </Select>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <div>
            <Label>Forma de pagamento</Label>
            <Select
              value={filters.paymentMethod}
              onChange={(e) => setFilters((prev) => ({ ...prev, paymentMethod: e.target.value }))}
            >
              <option value="">Todas (não configurado)</option>
            </Select>
          </div>
          <Button variant="outline" className="self-end" onClick={() => setFilters(DEFAULT_FILTERS)}>Limpar filtros</Button>
          <Button className="self-end" onClick={exportCsv} disabled={!totalItems}>Exportar CSV</Button>
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <SectionTitle title="Fechamentos de locações" subtitle="Histórico completo com valores e quilometragem" />
          <p className="text-sm text-slate-500">
            {totalItems} registro(s) • Página {currentPage} de {totalPages}
          </p>
        </div>

        {loading ? (
          <div className="grid gap-3 p-4">
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
            <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-4">
            <EmptyState message="Nenhum histórico encontrado para os filtros aplicados." />
          </div>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {items.map((row) => (
                <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <p className="font-semibold text-slate-800">{row.clientes?.nome || "-"}</p>
                    <Badge status={row.status as RentalStatus} />
                  </div>
                  <p className="text-sm text-slate-600">{row.carros?.marca} {row.carros?.modelo} ({row.carros?.placa ? maskPlate(row.carros.placa) : "-"})</p>
                  <p className="mt-1 text-sm text-slate-500">Retirada: {formatDate(row.data_retirada)} | Devolução: {formatDate(row.data_devolucao_real)}</p>
                  <p className="mt-1 text-sm text-slate-500">KM: {formatKm(row.km_saida)} {"->"} {formatKm(row.km_entrada)} ({formatKm(toKmDriven(row))})</p>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{formatCurrencyBRL(row.valor_final || row.valor_total)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setSelected(row)}>Detalhes</Button>
                    <Link to={`/contratos/${row.id}`}><Button variant="outline">Contrato</Button></Link>
                    <Button variant="secondary" onClick={() => window.open(`/contratos/${row.id}`, "_blank")}>Imprimir</Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Cliente</th>
                    <th className="px-4 py-3">Veículo</th>
                    <th className="px-4 py-3">Placa</th>
                    <th className="px-4 py-3">Retirada</th>
                    <th className="px-4 py-3">Devolução</th>
                    <th className="px-4 py-3">Previsto</th>
                    <th className="px-4 py-3">Adicional</th>
                    <th className="px-4 py-3">Valor Final</th>
                    <th className="px-4 py-3">KM Saída</th>
                    <th className="px-4 py-3">KM Devolução</th>
                    <th className="px-4 py-3">KM Rodado</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-700">#{row.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-slate-700">{row.clientes?.nome || "-"}</td>
                      <td className="px-4 py-3 text-slate-600">{row.carros?.marca} {row.carros?.modelo}</td>
                      <td className="px-4 py-3 text-slate-600">{row.carros?.placa ? maskPlate(row.carros.placa) : "-"}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(row.data_retirada)}</td>
                      <td className="px-4 py-3 text-slate-500">{formatDate(row.data_devolucao_real)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatCurrencyBRL(row.valor_previsto || row.valor_total || 0)}</td>
                      <td className="px-4 py-3 text-slate-700">{formatCurrencyBRL(row.valor_adicional || 0)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{formatCurrencyBRL(row.valor_final || row.valor_total || 0)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatKm(row.km_saida)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatKm(row.km_entrada)}</td>
                      <td className="px-4 py-3 text-slate-600">{formatKm(toKmDriven(row))}</td>
                      <td className="px-4 py-3"><Badge status={row.status as RentalStatus} /></td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button variant="outline" onClick={() => setSelected(row)}>Detalhes</Button>
                          <Link to={`/contratos/${row.id}`}><Button variant="outline">Contrato</Button></Link>
                          <Button variant="secondary" onClick={() => window.open(`/contratos/${row.id}`, "_blank")}>Imprimir</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalItems > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
                <p className="text-sm text-slate-500">
                  Mostrando {Math.min((currentPage - 1) * pageSize + 1, totalItems)}-
                  {Math.min(currentPage * pageSize, totalItems)} de {totalItems}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .slice(Math.max(0, currentPage - 3), Math.max(0, currentPage - 3) + 5)
                      .map((page) => (
                        <Button
                          key={page}
                          variant={page === currentPage ? "primary" : "outline"}
                          className="h-9 min-w-9 px-3"
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      ))}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>

      <Modal open={!!selected} title="Detalhes do histórico" onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="p-4">
                <SectionTitle title="Dados do cliente" />
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p><strong>Nome:</strong> {selected.clientes?.nome || "-"}</p>
                  <p><strong>CPF:</strong> {selected.clientes?.cpf ? maskCpf(selected.clientes.cpf) : "-"}</p>
                  <p><strong>CNH:</strong> {selected.clientes?.cnh ? maskCnh(selected.clientes.cnh) : "-"}</p>
                  <p><strong>Telefone:</strong> {selected.clientes?.telefone ? maskPhone(selected.clientes.telefone) : "-"}</p>
                </div>
              </Card>

              <Card className="p-4">
                <SectionTitle title="Dados do veículo" />
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p><strong>Marca:</strong> {selected.carros?.marca || "-"}</p>
                  <p><strong>Modelo:</strong> {selected.carros?.modelo || "-"}</p>
                  <p><strong>Placa:</strong> {selected.carros?.placa ? maskPlate(selected.carros.placa) : "-"}</p>
                  <p><strong>Ano:</strong> {selected.carros?.ano || "-"}</p>
                  <p><strong>Cor:</strong> {selected.carros?.cor || "-"}</p>
                </div>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Card className="p-4">
                <SectionTitle title="Dados financeiros" />
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p><strong>Valor da diária:</strong> {formatCurrencyBRL(selected.valor_diaria || 0)}</p>
                  <p><strong>Quantidade de diárias:</strong> {selected.quantidade_diarias || 0}</p>
                  <p><strong>Valor previsto:</strong> {formatCurrencyBRL(selected.valor_previsto || selected.valor_total || 0)}</p>
                  <p><strong>Valor adicional:</strong> {formatCurrencyBRL(selected.valor_adicional || 0)}</p>
                  <p><strong>Valor final:</strong> {formatCurrencyBRL(selected.valor_final || selected.valor_total || 0)}</p>
                  <p><strong>Dias extras:</strong> {selected.dias_extras || 0}</p>
                  <p><strong>Horas de atraso:</strong> {(selected.horas_atraso || 0).toFixed(2)}h</p>
                </div>
              </Card>

              <Card className="p-4">
                <SectionTitle title="Dados da locação" />
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p><strong>Retirada:</strong> {formatDateTime(selected.data_retirada)}</p>
                  <p><strong>Prevista:</strong> {formatDateTime(selected.data_prevista_devolucao)}</p>
                  <p><strong>Devolução real:</strong> {formatDateTime(selected.data_devolucao_real)}</p>
                  <p className="flex items-center gap-2"><strong>Status:</strong> <Badge status={selected.status as RentalStatus} /></p>
                </div>
              </Card>

              <Card className="p-4">
                <SectionTitle title="Quilometragem" />
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <p><strong>KM saída:</strong> {formatKm(selected.km_saida)}</p>
                  <p><strong>KM devolução:</strong> {formatKm(selected.km_entrada)}</p>
                  <p><strong>KM rodado:</strong> {formatKm(toKmDriven(selected))}</p>
                </div>
              </Card>
            </div>

            <Card className="p-4">
              <SectionTitle title="Observações" />
              <p className="mt-3 text-sm text-slate-600">{selected.observacoes_devolucao || "Sem observações de devolução."}</p>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Link to={`/contratos/${selected.id}`}><Button><Car size={16} className="mr-2" /> Visualizar contrato</Button></Link>
              <Button variant="secondary" onClick={() => window.open(`/contratos/${selected.id}`, "_blank")}><Printer size={16} className="mr-2" /> Imprimir contrato</Button>
              <Button variant="outline" onClick={() => setSelected(null)}><CalendarDays size={16} className="mr-2" /> Fechar detalhes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
