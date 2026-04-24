import { useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Label, Modal, Select, Badge, EmptyState } from "../components/ui";
import { supabase } from "../lib/supabase";
import type { Carro, Cliente, Locacao, RentalStatus } from "../types/entities";
import { buildContractHtml } from "../lib/contract";
import { formatCurrencyBRL, formatDate, formatDateTime, formatKm, maskCnh, maskCpf, maskKmInput, maskPhone, maskPlate, unmaskKmInput } from "../lib/format";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import { calculateKmDriven, calculateRentalDays, calculateRentalTotal } from "../lib/rental";
import { useBranding } from "../hooks/useBranding";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { DateTimePicker } from "../components/DateTimePicker";

export const RentalsPage = () => {
  const { user } = useAuth();
  const { nomeLocadora, logoUrl } = useBranding();
  const [locacoes, setLocacoes] = useState<Locacao[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carros, setCarros] = useState<Carro[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openReturn, setOpenReturn] = useState<Locacao | null>(null);
  const [detail, setDetail] = useState<Locacao | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [newRental, setNewRental] = useState({ cliente_id: "", carro_id: "", data_retirada: "", data_prevista_devolucao: "", quantidade_diarias: "1" });
  const [returnData, setReturnData] = useState({ data_devolucao_real: "", km_entrada: "", observacoes_devolucao: "" });
  const debouncedSearch = useDebouncedValue(search, 300);

  const carroSelecionado = useMemo(() => carros.find((c) => c.id === newRental.carro_id), [carros, newRental.carro_id]);
  const clienteSelecionado = useMemo(() => clientes.find((c) => c.id === newRental.cliente_id), [clientes, newRental.cliente_id]);
  const diarias = Number(newRental.quantidade_diarias || 0);
  const totalPreview = calculateRentalTotal(diarias, Number(carroSelecionado?.valor_diaria || 0));
  const kmEntradaPreview = unmaskKmInput(returnData.km_entrada);
  const kmRodadoPreview = openReturn ? calculateKmDriven(openReturn.km_saida, kmEntradaPreview) : 0;
  const returnDisabled = saving || !openReturn || !returnData.km_entrada.trim() || kmEntradaPreview < (openReturn?.km_saida || 0);

  useEffect(() => {
    const diariasAuto = calculateRentalDays(newRental.data_retirada, newRental.data_prevista_devolucao);
    setNewRental((prev) => ({ ...prev, quantidade_diarias: String(diariasAuto) }));
  }, [newRental.data_retirada, newRental.data_prevista_devolucao]);

  useEffect(() => {
    if (!newRental.data_retirada || newRental.data_prevista_devolucao) return;
    const retirada = new Date(newRental.data_retirada);
    if (Number.isNaN(retirada.getTime())) return;
    const previsao = new Date(retirada.getTime() + 24 * 60 * 60 * 1000);
    const localIso = new Date(previsao.getTime() - previsao.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setNewRental((prev) => ({ ...prev, data_prevista_devolucao: localIso }));
  }, [newRental.data_retirada, newRental.data_prevista_devolucao]);

  const loadBase = async () => {
    const [{ data: clientesData }, { data: carrosData }] = await Promise.all([
      supabase.from("clientes").select("*").order("nome"),
      supabase.from("carros").select("*").order("marca"),
    ]);
    setClientes((clientesData as Cliente[]) || []);
    setCarros((carrosData as Carro[]) || []);
  };

  const loadLocacoes = async () => {
    setLoading(true);
    let query = supabase.from("locacoes").select("*,clientes(*),carros(*),profiles(nome,email)").order("created_at", { ascending: false });
    if (statusFilter) query = query.eq("status", statusFilter);
    const { data, error } = await query;
    setLoading(false);
    if (error) return toast.error(error.message);
    const rows = ((data as Locacao[]) || []).filter((item) => {
      if (!debouncedSearch.trim()) return true;
      const term = debouncedSearch.toLowerCase();
      return item.clientes?.nome?.toLowerCase().includes(term) || item.carros?.placa?.toLowerCase().includes(term);
    });
    setLocacoes(rows);
  };

  useEffect(() => {
    loadBase();
  }, []);

  useEffect(() => {
    loadLocacoes();
  }, [statusFilter, debouncedSearch]);

  const createRental = async () => {
    const cliente = clientes.find((c) => c.id === newRental.cliente_id);
    const carro = carros.find((c) => c.id === newRental.carro_id);
    if (!cliente || !carro) return toast.error("Selecione cliente e veículo");
    if (carro.status !== "disponivel") return toast.error("Apenas veículos disponíveis podem ser locados.");
    if (!newRental.data_retirada || !newRental.data_prevista_devolucao) return toast.error("Informe as datas");
    if (new Date(newRental.data_prevista_devolucao) < new Date(newRental.data_retirada)) return toast.error("Data prevista não pode ser menor que retirada");
    if (diarias < 1) return toast.error("A quantidade de diárias deve ser maior que zero.");

    const contrato = buildContractHtml({
      cliente,
      carro,
      kmSaida: carro.km_atual,
      dataRetirada: newRental.data_retirada,
      dataPrevistaDevolucao: newRental.data_prevista_devolucao,
      quantidadeDiarias: diarias,
      valorDiaria: carro.valor_diaria,
      valorTotal: totalPreview,
      locadoraNome: nomeLocadora,
      logoUrl,
      contratoCodigo: `CTR-${Date.now().toString().slice(-8)}`,
      statusLocacao: "aberta",
    });

    setSaving(true);
    const { error } = await supabase.from("locacoes").insert({
      cliente_id: newRental.cliente_id,
      carro_id: newRental.carro_id,
      usuario_id: user?.id || null,
      data_retirada: newRental.data_retirada,
      data_prevista_devolucao: newRental.data_prevista_devolucao,
      quantidade_diarias: diarias,
      valor_diaria: carro.valor_diaria,
      valor_total: totalPreview,
      km_saida: carro.km_atual,
      contrato_html: contrato,
      status: "aberta",
    });
    setSaving(false);
    if (error) return toast.error(error.message.includes("nao esta disponivel") ? "Este veículo não está disponível para locação." : error.message);
    toast.success("Locação realizada com sucesso");
    setOpenCreate(false);
    setNewRental({ cliente_id: "", carro_id: "", data_retirada: "", data_prevista_devolucao: "", quantidade_diarias: "1" });
    loadBase();
    loadLocacoes();
  };

  const finishReturn = async () => {
    if (!openReturn) return;
    const kmEntrada = kmEntradaPreview;
    if (kmEntrada < openReturn.km_saida) return toast.error("KM de devolução não pode ser menor que KM de saída");
    if (!window.confirm("Confirma a finalização da devolução?")) return;

    setSaving(true);
    const { error } = await supabase
      .from("locacoes")
      .update({
        status: "finalizada",
        data_devolucao_real: returnData.data_devolucao_real || new Date().toISOString(),
        km_entrada: kmEntrada,
        km_rodado: calculateKmDriven(openReturn.km_saida, kmEntrada),
        observacoes_devolucao: returnData.observacoes_devolucao || null,
      })
      .eq("id", openReturn.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Devolução finalizada com sucesso");
    setOpenReturn(null);
    setReturnData({ data_devolucao_real: "", km_entrada: "", observacoes_devolucao: "" });
    loadBase();
    loadLocacoes();
  };

  const cancelRental = async (rental: Locacao) => {
    if (!window.confirm("Confirma o cancelamento desta locação?")) return;
    const { error } = await supabase.from("locacoes").update({ status: "cancelada" }).eq("id", rental.id);
    if (error) return toast.error(error.message);
    toast.success("Locação cancelada com sucesso");
    loadBase();
    loadLocacoes();
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <h2 className="mr-auto text-lg font-semibold text-slate-900">Locações</h2>
          <Input placeholder="Buscar por cliente ou placa" className="w-full sm:max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select className="w-full sm:max-w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos status</option>
            <option value="aberta">Aberta</option>
            <option value="finalizada">Finalizada</option>
            <option value="cancelada">Cancelada</option>
          </Select>
          <Button onClick={() => setOpenCreate(true)}>Nova locação</Button>
        </div>
        <div className="space-y-3 sm:hidden">
          {!loading && locacoes.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="font-semibold text-slate-800">{item.clientes?.nome}</p>
              <p className="text-sm text-slate-500">{item.carros?.marca} {item.carros?.modelo} ({item.carros?.placa ? maskPlate(item.carros.placa) : "-"})</p>
              <p className="mt-1 text-sm text-slate-500">{formatDate(item.data_retirada)} - {formatDate(item.data_prevista_devolucao)}</p>
              <div className="mt-2 flex items-center justify-between">
                <Badge status={item.status} />
                <span className="text-sm font-medium text-slate-700">{formatCurrencyBRL(item.valor_total)}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setDetail(item)}>Detalhes</Button>
                <Link to={`/contratos/${item.id}`}><Button variant="outline">Contrato</Button></Link>
                {item.status === "aberta" && (
                  <>
                    <Button onClick={() => setOpenReturn(item)}>Finalizar</Button>
                    <Button variant="danger" onClick={() => cancelRental(item)}>Cancelar</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Veículo</th><th className="hidden px-4 py-3 md:table-cell">Período</th><th className="hidden px-4 py-3 md:table-cell">Valor</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr>
            </thead>
            <tbody>
              {!loading && locacoes.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-700">{item.clientes?.nome}</td>
                  <td className="px-4 py-3 text-slate-600">{item.carros?.marca} {item.carros?.modelo} ({item.carros?.placa ? maskPlate(item.carros.placa) : "-"})</td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{formatDate(item.data_retirada)} - {formatDate(item.data_prevista_devolucao)}</td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{formatCurrencyBRL(item.valor_total)}</td>
                  <td className="px-4 py-3"><Badge status={item.status} /></td>
                  <td className="space-x-2 px-4 py-3 text-right">
                    <Button variant="outline" onClick={() => setDetail(item)}>Detalhes</Button>
                    <Link to={`/contratos/${item.id}`}><Button variant="outline">Contrato</Button></Link>
                    {item.status === "aberta" && (
                      <>
                        <Button onClick={() => setOpenReturn(item)}>Finalizar</Button>
                        <Button variant="danger" onClick={() => cancelRental(item)}>Cancelar</Button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <p className="py-5 text-center text-sm text-slate-500">Carregando locações...</p>}
        {!loading && locacoes.length === 0 && <EmptyState message="Nenhuma locação encontrada para os filtros atuais." />}
      </Card>

      <Modal open={openCreate} title="Nova locação" onClose={() => setOpenCreate(false)}>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Cliente</Label><Select value={newRental.cliente_id} onChange={(e) => setNewRental({ ...newRental, cliente_id: e.target.value })}><option value="">Selecione</option>{clientes.map((c) => <option key={c.id} value={c.id}>{c.nome} ({maskCpf(c.cpf)})</option>)}</Select></div>
          <div>
            <Label>Veículo</Label>
            <Select value={newRental.carro_id} onChange={(e) => setNewRental({ ...newRental, carro_id: e.target.value })}>
              <option value="">Selecione</option>
              {carros.map((c) => (
                <option key={c.id} value={c.id} disabled={c.status !== "disponivel"}>
                  {c.marca} {c.modelo} - {maskPlate(c.placa)} ({c.status})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Data retirada</Label>
            <DateTimePicker value={newRental.data_retirada} onChange={(value) => setNewRental({ ...newRental, data_retirada: value })} />
          </div>
          <div>
            <Label>Data prevista devolução</Label>
            <DateTimePicker value={newRental.data_prevista_devolucao} min={newRental.data_retirada} onChange={(value) => setNewRental({ ...newRental, data_prevista_devolucao: value })} />
          </div>
          <div>
            <Label>Quantidade diárias (automático)</Label>
            <Input inputMode="numeric" value={newRental.quantidade_diarias} readOnly />
            <p className="mt-1 text-xs text-slate-500">Diárias calculadas automaticamente pelo período selecionado.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm md:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumo da locação</p>
                <p className="text-sm text-slate-700">Confira os dados antes de gerar contrato</p>
              </div>
              <Badge status={carroSelecionado?.status || "disponivel"} />
            </div>

            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
                <p className="mt-1 font-semibold text-slate-800">{clienteSelecionado?.nome || "-"}</p>
                <p className="mt-1 text-slate-600">
                  CPF/CNH: <strong>{clienteSelecionado ? `${maskCpf(clienteSelecionado.cpf)} | ${maskCnh(clienteSelecionado.cnh)}` : "-"}</strong>
                </p>
                <p className="text-slate-600">Telefone: <strong>{clienteSelecionado?.telefone ? maskPhone(clienteSelecionado.telefone) : "-"}</strong></p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Veículo</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {carroSelecionado ? `${carroSelecionado.marca} ${carroSelecionado.modelo}` : "-"}
                </p>
                <p className="mt-1 text-slate-600">
                  Placa: <strong>{carroSelecionado?.placa ? maskPlate(carroSelecionado.placa) : "-"}</strong>
                </p>
                <p className="text-slate-600">KM saída: <strong>{formatKm(carroSelecionado?.km_atual)}</strong></p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diárias</p>
                <p className="mt-1 font-semibold text-slate-800">{diarias || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor da diária</p>
                <p className="mt-1 font-semibold text-slate-800">{formatCurrencyBRL(carroSelecionado?.valor_diaria ?? 0)}</p>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Valor total</p>
                <p className="mt-1 text-lg font-bold text-blue-800">{formatCurrencyBRL(totalPreview)}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4"><Button disabled={saving || !newRental.cliente_id || !newRental.carro_id || !newRental.data_retirada || !newRental.data_prevista_devolucao} onClick={createRental}>{saving ? "Salvando..." : "Gerar locação e contrato"}</Button></div>
      </Modal>

      <Modal open={!!openReturn} title="Finalizar devolução" onClose={() => setOpenReturn(null)}>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumo da devolução</p>
              <p className="text-sm text-slate-700">Confira os dados antes de finalizar</p>
            </div>
            <Badge status={openReturn?.status || "aberta"} />
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
              <p className="mt-1 font-semibold text-slate-800">{openReturn?.clientes?.nome || "-"}</p>
              <p className="mt-1 text-slate-600">
                Veículo: <strong>{openReturn?.carros?.marca} {openReturn?.carros?.modelo} ({openReturn?.carros?.placa ? maskPlate(openReturn.carros.placa) : "-"})</strong>
              </p>
              <p className="text-slate-600">
                Período: <strong>{formatDateTime(openReturn?.data_retirada)} - {formatDateTime(openReturn?.data_prevista_devolucao)}</strong>
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valores e KM</p>
              <p className="mt-1 text-slate-600">KM saída: <strong>{formatKm(openReturn?.km_saida)}</strong></p>
              <p className="text-slate-600">KM rodado (prévia): <strong>{formatKm(kmRodadoPreview)}</strong></p>
              <p className="text-slate-600">Valor total: <strong>{formatCurrencyBRL(openReturn?.valor_total || 0)}</strong></p>
            </div>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <Label>Data devolução</Label>
            <DateTimePicker value={returnData.data_devolucao_real} min={openReturn?.data_retirada} onChange={(value) => setReturnData({ ...returnData, data_devolucao_real: value })} />
          </div>
          <div><Label>KM devolução</Label><Input inputMode="numeric" value={returnData.km_entrada} placeholder="Ex: 12.950" onChange={(e) => setReturnData({ ...returnData, km_entrada: maskKmInput(e.target.value) })} /></div>
          <div className="md:col-span-2"><Label>Observação</Label><Input value={returnData.observacoes_devolucao} onChange={(e) => setReturnData({ ...returnData, observacoes_devolucao: e.target.value })} /></div>
        </div>
        <div className="mt-4"><Button disabled={returnDisabled} onClick={finishReturn}>{saving ? "Finalizando..." : "Finalizar devolução"}</Button></div>
      </Modal>

      <Modal open={!!detail} title="Detalhes da locação" onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resumo da locação</p>
                  <p className="text-sm text-slate-700">Informações detalhadas do contrato e operação</p>
                </div>
                <Badge status={detail.status as RentalStatus} />
              </div>
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</p>
                  <p className="mt-1 font-semibold text-slate-800">{detail.clientes?.nome || "-"}</p>
                  <p className="mt-1 text-slate-600">
                    Veículo: <strong>{detail.carros?.marca} {detail.carros?.modelo} ({detail.carros?.placa ? maskPlate(detail.carros.placa) : "-"})</strong>
                  </p>
                  <p className="text-slate-600">
                    Período: <strong>{formatDateTime(detail.data_retirada)} - {formatDateTime(detail.data_prevista_devolucao)}</strong>
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Auditoria</p>
                  <p className="mt-1 text-slate-600">Criado em: <strong>{formatDateTime(detail.created_at)}</strong></p>
                  <p className="text-slate-600">Usuário responsável: <strong>{detail.profiles?.nome || detail.profiles?.email || "-"}</strong></p>
                  <p className="text-slate-600">Observações: <strong>{detail.observacoes_devolucao || "-"}</strong></p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diárias</p>
                  <p className="mt-1 font-semibold text-slate-800">{detail.quantidade_diarias}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">KM</p>
                  <p className="mt-1 text-slate-700">Saída: <strong>{formatKm(detail.km_saida)}</strong></p>
                  <p className="text-slate-700">Entrada: <strong>{formatKm(detail.km_entrada)}</strong></p>
                  <p className="text-slate-700">Rodado: <strong>{formatKm(detail.km_rodado)}</strong></p>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Financeiro</p>
                  <p className="mt-1 text-blue-800">Diária: <strong>{formatCurrencyBRL(detail.valor_diaria)}</strong></p>
                  <p className="text-lg font-bold text-blue-900">Total: {formatCurrencyBRL(detail.valor_total)}</p>
                </div>
              </div>
            </div>
            <div>
              <Link to={`/contratos/${detail.id}`}><Button>Visualizar e imprimir contrato</Button></Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
