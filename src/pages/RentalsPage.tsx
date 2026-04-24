import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Card, Input, Label, Modal, Select, Badge, EmptyState } from "../components/ui";
import { supabase } from "../lib/supabase";
import type { Carro, Cliente, Locacao, RentalStatus } from "../types/entities";
import { formatCurrencyBRL, formatDate, formatDateTime, formatKm, maskCnh, maskCpf, maskKmInput, maskPhone, maskPlate, unmaskKmInput } from "../lib/format";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";
import { Link, useNavigate } from "react-router-dom";
import { calculateKmDriven, calculateRentalDays, calculateRentalTotal, calculateReturnPricing } from "../lib/rental";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { DateTimePicker } from "../components/DateTimePicker";

export const RentalsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const [newRental, setNewRental] = useState({
    cliente_id: "",
    carro_id: "",
    data_retirada: "",
    data_prevista_devolucao: "",
    quantidade_diarias: "1",
    contrato_observacoes: "",
    testemunha1_nome: "",
    testemunha1_cpf: "",
    testemunha2_nome: "",
    testemunha2_cpf: "",
  });
  const [returnData, setReturnData] = useState({ data_devolucao_real: "", km_entrada: "", observacoes_devolucao: "" });
  const debouncedSearch = useDebouncedValue(search, 300);

  const carroSelecionado = useMemo(() => carros.find((c) => c.id === newRental.carro_id), [carros, newRental.carro_id]);
  const clienteSelecionado = useMemo(() => clientes.find((c) => c.id === newRental.cliente_id), [clientes, newRental.cliente_id]);
  const diarias = Number(newRental.quantidade_diarias || 0);
  const totalPreview = calculateRentalTotal(diarias, Number(carroSelecionado?.valor_diaria || 0));
  const kmEntradaPreview = unmaskKmInput(returnData.km_entrada);
  const kmRodadoPreview = openReturn ? calculateKmDriven(openReturn.km_saida, kmEntradaPreview) : 0;
  const valorPrevistoLocacao = openReturn ? Number(openReturn.valor_previsto ?? openReturn.valor_total ?? 0) : 0;
  const dataDevolucaoRealPreview = returnData.data_devolucao_real || new Date().toISOString();
  const pricingPreview = useMemo(
    () =>
      calculateReturnPricing({
        dataPrevistaDevolucao: openReturn?.data_prevista_devolucao,
        dataDevolucaoReal: dataDevolucaoRealPreview,
        valorDiaria: Number(openReturn?.valor_diaria || 0),
        valorPrevisto: valorPrevistoLocacao,
      }),
    [openReturn?.data_prevista_devolucao, openReturn?.valor_diaria, dataDevolucaoRealPreview, valorPrevistoLocacao],
  );
  const returnDisabled = saving || !openReturn || !returnData.km_entrada.trim() || kmEntradaPreview < (openReturn?.km_saida || 0);

  useEffect(() => {
    const diariasAuto = calculateRentalDays(newRental.data_retirada, newRental.data_prevista_devolucao);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNewRental((prev) => ({ ...prev, quantidade_diarias: String(diariasAuto) }));
  }, [newRental.data_retirada, newRental.data_prevista_devolucao]);

  useEffect(() => {
    if (!newRental.data_retirada || newRental.data_prevista_devolucao) return;
    const retirada = new Date(newRental.data_retirada);
    if (Number.isNaN(retirada.getTime())) return;
    const previsao = new Date(retirada.getTime() + 24 * 60 * 60 * 1000);
    const localIso = new Date(previsao.getTime() - previsao.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const loadLocacoes = useCallback(async () => {
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
  }, [statusFilter, debouncedSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadBase();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLocacoes();
  }, [loadLocacoes]);

  const createRental = async () => {
    const cliente = clientes.find((c) => c.id === newRental.cliente_id);
    const carro = carros.find((c) => c.id === newRental.carro_id);
    if (!cliente || !carro) return toast.error("Selecione cliente e veículo");
    if (carro.status !== "disponivel") return toast.error("Apenas veículos disponíveis podem ser locados.");
    if (!newRental.data_retirada || !newRental.data_prevista_devolucao) return toast.error("Informe as datas");
    if (new Date(newRental.data_prevista_devolucao) < new Date(newRental.data_retirada)) return toast.error("Data prevista não pode ser menor que retirada");
    if (diarias < 1) return toast.error("A quantidade de diárias deve ser maior que zero.");

    setSaving(true);
    const { data: created, error } = await supabase
      .from("locacoes")
      .insert({
        cliente_id: newRental.cliente_id,
        carro_id: newRental.carro_id,
        usuario_id: user?.id || null,
        data_retirada: newRental.data_retirada,
        data_prevista_devolucao: newRental.data_prevista_devolucao,
        quantidade_diarias: diarias,
        valor_diaria: carro.valor_diaria,
        valor_previsto: totalPreview,
        valor_final: totalPreview,
        valor_adicional: 0,
        dias_extras: 0,
        horas_atraso: 0,
        valor_total: totalPreview,
        km_saida: carro.km_atual,
        contrato_html: null,
        contrato_observacoes: newRental.contrato_observacoes || null,
        testemunha1_nome: newRental.testemunha1_nome || null,
        testemunha1_cpf: newRental.testemunha1_cpf || null,
        testemunha2_nome: newRental.testemunha2_nome || null,
        testemunha2_cpf: newRental.testemunha2_cpf || null,
        status: "aberta",
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message.includes("nao esta disponivel") ? "Este veículo não está disponível para locação." : error.message);
    toast.success("Locação realizada com sucesso");
    setOpenCreate(false);
    setNewRental({
      cliente_id: "",
      carro_id: "",
      data_retirada: "",
      data_prevista_devolucao: "",
      quantidade_diarias: "1",
      contrato_observacoes: "",
      testemunha1_nome: "",
      testemunha1_cpf: "",
      testemunha2_nome: "",
      testemunha2_cpf: "",
    });
    loadBase();
    loadLocacoes();
    if (created?.id) navigate(`/contratos/${created.id}`);
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
        data_devolucao_real: dataDevolucaoRealPreview,
        km_entrada: kmEntrada,
        km_devolucao: kmEntrada,
        km_rodado: calculateKmDriven(openReturn.km_saida, kmEntrada),
        km_rodado_real: calculateKmDriven(openReturn.km_saida, kmEntrada),
        dias_extras: pricingPreview.diasExtras,
        horas_atraso: pricingPreview.horasAtraso,
        valor_previsto: valorPrevistoLocacao,
        valor_adicional: pricingPreview.valorAdicional,
        valor_final: pricingPreview.valorFinal,
        valor_total: pricingPreview.valorFinal,
        observacoes_devolucao: returnData.observacoes_devolucao || null,
        observacao_devolucao: returnData.observacoes_devolucao || null,
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
      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap gap-2 sm:gap-3">
          <h2 className="mr-auto text-lg font-semibold text-slate-900">Locações</h2>
          <Input placeholder="Buscar por cliente ou placa" className="w-full sm:max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select className="w-full sm:max-w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos status</option>
            <option value="aberta">Aberta</option>
            <option value="finalizada">Finalizada</option>
            <option value="cancelada">Cancelada</option>
          </Select>
          <Button className="w-full sm:w-auto" onClick={() => setOpenCreate(true)}>Nova locação</Button>
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
              <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                <Button className="w-full sm:w-auto" variant="outline" onClick={() => setDetail(item)}>Detalhes</Button>
                <Link className="w-full sm:w-auto" to={`/contratos/${item.id}`}><Button className="w-full sm:w-auto" variant="outline">Gerar Contrato</Button></Link>
                {item.status === "aberta" && (
                  <>
                    <Button className="w-full sm:w-auto" onClick={() => setOpenReturn(item)}>Finalizar</Button>
                    <Button className="w-full sm:w-auto" variant="danger" onClick={() => cancelRental(item)}>Cancelar</Button>
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
                    <Link to={`/contratos/${item.id}`}><Button variant="outline">Gerar Contrato</Button></Link>
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
          <div className="grid gap-3 md:col-span-2 md:grid-cols-2">
            <div><Label>Observações adicionais do contrato (opcional)</Label><Input value={newRental.contrato_observacoes} onChange={(e) => setNewRental({ ...newRental, contrato_observacoes: e.target.value })} /></div>
            <div><Label>Testemunha 1 - Nome</Label><Input value={newRental.testemunha1_nome} onChange={(e) => setNewRental({ ...newRental, testemunha1_nome: e.target.value })} /></div>
            <div><Label>Testemunha 1 - CPF</Label><Input value={newRental.testemunha1_cpf} onChange={(e) => setNewRental({ ...newRental, testemunha1_cpf: maskCpf(e.target.value) })} /></div>
            <div><Label>Testemunha 2 - Nome</Label><Input value={newRental.testemunha2_nome} onChange={(e) => setNewRental({ ...newRental, testemunha2_nome: e.target.value })} /></div>
            <div><Label>Testemunha 2 - CPF</Label><Input value={newRental.testemunha2_cpf} onChange={(e) => setNewRental({ ...newRental, testemunha2_cpf: maskCpf(e.target.value) })} /></div>
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
        <div className="mt-4"><Button className="w-full sm:w-auto" disabled={saving || !newRental.cliente_id || !newRental.carro_id || !newRental.data_retirada || !newRental.data_prevista_devolucao} onClick={createRental}>{saving ? "Salvando..." : "Gerar locação e contrato"}</Button></div>
      </Modal>

      <Modal open={!!openReturn} title="Finalizar devolução" onClose={() => setOpenReturn(null)}>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 sm:p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
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
              <p className="text-slate-600">Valor previsto: <strong>{formatCurrencyBRL(valorPrevistoLocacao)}</strong></p>
            </div>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diárias contratadas</p>
              <p className="mt-1 font-semibold text-slate-800">{openReturn?.quantidade_diarias || 0}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diárias extras</p>
              <p className="mt-1 font-semibold text-slate-800">{pricingPreview.diasExtras}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Horas de atraso</p>
              <p className="mt-1 font-semibold text-slate-800">{pricingPreview.horasAtraso.toFixed(2)}h</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor da diária</p>
              <p className="mt-1 font-semibold text-slate-800">{formatCurrencyBRL(openReturn?.valor_diaria || 0)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valor adicional</p>
              <p className="mt-1 font-semibold text-slate-800">{formatCurrencyBRL(pricingPreview.valorAdicional)}</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Valor final</p>
              <p className="mt-1 text-lg font-bold text-blue-900">{formatCurrencyBRL(pricingPreview.valorFinal)}</p>
            </div>
          </div>
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <p className="text-slate-600">Data prevista: <strong>{formatDateTime(openReturn?.data_prevista_devolucao)}</strong></p>
            <p className="text-slate-600">Data real (prévia): <strong>{formatDateTime(dataDevolucaoRealPreview)}</strong></p>
            <p className="text-slate-600">Diferença a cobrar: <strong>{formatCurrencyBRL(pricingPreview.diferencaACobrar)}</strong></p>
          </div>
          {pricingPreview.diasExtras > 0 && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Cliente permaneceu com o veículo por mais <strong>{pricingPreview.diasExtras}</strong> dia(s). Valor adicional a cobrar:{" "}
              <strong>{formatCurrencyBRL(pricingPreview.valorAdicional)}</strong>.
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <Label>Data devolução</Label>
            <DateTimePicker value={returnData.data_devolucao_real} min={openReturn?.data_retirada} onChange={(value) => setReturnData({ ...returnData, data_devolucao_real: value })} />
          </div>
          <div><Label>KM devolução</Label><Input inputMode="numeric" value={returnData.km_entrada} placeholder="Ex: 12.950" onChange={(e) => setReturnData({ ...returnData, km_entrada: maskKmInput(e.target.value) })} /></div>
          <div className="md:col-span-2"><Label>Observação</Label><Input value={returnData.observacoes_devolucao} onChange={(e) => setReturnData({ ...returnData, observacoes_devolucao: e.target.value })} /></div>
        </div>
        <div className="mt-4"><Button className="w-full sm:w-auto" disabled={returnDisabled} onClick={finishReturn}>{saving ? "Finalizando..." : "Finalizar devolução"}</Button></div>
      </Modal>

      <Modal open={!!detail} title="Detalhes da locação" onClose={() => setDetail(null)}>
        {detail && (
          <div className="space-y-3">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-3 sm:p-4 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
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
                  <p className="text-blue-800">Previsto: <strong>{formatCurrencyBRL(detail.valor_previsto ?? detail.valor_total)}</strong></p>
                  <p className="text-blue-800">Adicional: <strong>{formatCurrencyBRL(detail.valor_adicional ?? 0)}</strong></p>
                  <p className="text-lg font-bold text-blue-900">Final: {formatCurrencyBRL(detail.valor_final ?? detail.valor_total)}</p>
                </div>
              </div>
            </div>
            <div>
              <Link to={`/contratos/${detail.id}`}><Button className="w-full sm:w-auto">Visualizar e imprimir contrato</Button></Link>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
