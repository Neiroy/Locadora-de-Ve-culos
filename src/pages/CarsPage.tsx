import { useEffect, useState } from "react";
import { Button, Card, Input, Label, Modal, Select, Badge, EmptyState } from "../components/ui";
import { supabase } from "../lib/supabase";
import type { Carro, CarStatus, Locacao } from "../types/entities";
import toast from "react-hot-toast";
import { formatCurrencyBRL, formatDate, formatKm, maskCurrencyInput, maskKmInput, maskPlate, maskYear, unmaskCurrencyInput, unmaskKmInput, unmaskPlate } from "../lib/format";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

type CarForm = {
  marca: string;
  modelo: string;
  placa: string;
  ano: string;
  cor: string;
  km_atual: string;
  valor_diaria: string;
  status: CarStatus;
  observacoes: string;
};

const initialForm: CarForm = {
  marca: "",
  modelo: "",
  placa: "",
  ano: String(new Date().getFullYear()),
  cor: "",
  km_atual: "",
  valor_diaria: "",
  status: "disponivel",
  observacoes: "",
};

export const CarsPage = () => {
  const [cars, setCars] = useState<Carro[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Carro | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Carro | null>(null);
  const [history, setHistory] = useState<Locacao[]>([]);
  const [form, setForm] = useState<CarForm>(initialForm);
  const debouncedSearch = useDebouncedValue(search, 300);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("carros").select("*").order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    if (debouncedSearch) query = query.or(`placa.ilike.%${debouncedSearch}%,marca.ilike.%${debouncedSearch}%,modelo.ilike.%${debouncedSearch}%`);
    const { data, error } = await query;
    setLoading(false);
    if (error) return toast.error(error.message);
    setCars((data as Carro[]) || []);
  };

  useEffect(() => {
    load();
  }, [debouncedSearch, status]);

  const openNew = () => {
    setEditing(null);
    setForm(initialForm);
    setOpen(true);
  };

  const openEdit = (car: Carro) => {
    setEditing(car);
    setForm({
      marca: car.marca,
      modelo: car.modelo,
      placa: maskPlate(car.placa),
      ano: String(car.ano),
      cor: car.cor || "",
      km_atual: maskKmInput(String(car.km_atual)),
      valor_diaria: String(car.valor_diaria).replace(".", ","),
      status: car.status,
      observacoes: car.observacoes || "",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.marca || !form.modelo || !form.placa) return toast.error("Preencha os campos obrigatórios.");
    const payload = {
      marca: form.marca.trim(),
      modelo: form.modelo.trim(),
      placa: unmaskPlate(form.placa),
      ano: Number(form.ano),
      cor: form.cor.trim() || null,
      km_atual: unmaskKmInput(form.km_atual),
      valor_diaria: unmaskCurrencyInput(form.valor_diaria),
      status: form.status,
      observacoes: form.observacoes.trim() || null,
    };

    if (payload.placa.length < 7) return toast.error("Placa inválida.");
    if (payload.ano < 1900 || payload.ano > 2100) return toast.error("Ano inválido.");
    if (payload.km_atual < 0) return toast.error("KM não pode ser negativo");
    if (payload.valor_diaria <= 0) return toast.error("Valor da diária deve ser maior que zero");
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("carros").update(payload).eq("id", editing.id);
      if (error) {
        setSaving(false);
        return toast.error(error.message.includes("carros_placa_key") ? "Já existe um veículo com esta placa." : error.message);
      }
      toast.success("Veículo atualizado com sucesso");
    } else {
      const { error } = await supabase.from("carros").insert(payload);
      if (error) {
        setSaving(false);
        return toast.error(error.message.includes("carros_placa_key") ? "Já existe um veículo com esta placa." : error.message);
      }
      toast.success("Veículo cadastrado com sucesso");
    }
    setSaving(false);
    setOpen(false);
    load();
  };

  const loadHistory = async (car: Carro) => {
    const { data, error } = await supabase
      .from("locacoes")
      .select("*,clientes(nome)")
      .eq("carro_id", car.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) return toast.error(error.message);
    setHistoryTarget(car);
    setHistory((data as Locacao[]) || []);
  };

  return (
    <Card className="p-0">
      <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Gestão de veículos</h2>
          <Button onClick={openNew}>Novo carro</Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input placeholder="Buscar por placa, marca, modelo" className="w-full sm:max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Select className="w-full sm:max-w-44" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos status</option>
          <option value="disponivel">Disponível</option>
          <option value="alugado">Alugado</option>
          <option value="manutencao">Manutenção</option>
        </Select>
        </div>
      </div>
      <div className="space-y-3 p-4 sm:hidden">
        {!loading && cars.map((car) => (
          <div key={car.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="font-semibold text-slate-800">{car.marca} {car.modelo}</p>
            <p className="text-sm text-slate-500">{car.placa} • {car.ano}</p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span>{formatKm(car.km_atual)}</span>
              <span>{formatCurrencyBRL(car.valor_diaria)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <Badge status={car.status} />
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => openEdit(car)}>Editar</Button>
                <Button variant="outline" onClick={() => loadHistory(car)}>Histórico</Button>
              </div>
            </div>
          </div>
        ))}
        {loading && <p className="py-5 text-center text-sm text-slate-500">Carregando veículos...</p>}
        {!loading && cars.length === 0 && <EmptyState message="Nenhum veículo encontrado para os filtros atuais." />}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3 sm:px-5">Marca/Modelo</th><th className="px-4 py-3 sm:px-5">Placa</th><th className="hidden px-4 py-3 sm:table-cell sm:px-5">Ano</th><th className="hidden px-4 py-3 sm:table-cell sm:px-5">KM</th><th className="hidden px-4 py-3 lg:table-cell sm:px-5">Diária</th><th className="px-4 py-3 sm:px-5">Status</th><th className="px-4 py-3 text-right sm:px-5">Ações</th></tr>
          </thead>
          <tbody>
            {!loading && cars.map((car) => (
              <tr key={car.id} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-700 sm:px-5">{car.marca} {car.modelo}</td>
                <td className="px-4 py-3 text-slate-600 sm:px-5">{car.placa}</td><td className="hidden px-4 py-3 text-slate-600 sm:table-cell sm:px-5">{car.ano}</td><td className="hidden px-4 py-3 text-slate-600 sm:table-cell sm:px-5">{formatKm(car.km_atual)}</td><td className="hidden px-4 py-3 text-slate-600 lg:table-cell sm:px-5">{formatCurrencyBRL(car.valor_diaria)}</td><td className="px-4 py-3 sm:px-5"><Badge status={car.status} /></td>
                <td className="space-x-2 px-4 py-3 text-right sm:px-5">
                  <Button variant="outline" onClick={() => openEdit(car)}>Editar</Button>
                  <Button variant="outline" onClick={() => loadHistory(car)}>Histórico</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <p className="py-5 text-center text-sm text-slate-500">Carregando veículos...</p>}
        {!loading && cars.length === 0 && <EmptyState message="Nenhum veículo encontrado para os filtros atuais." />}
      </div>
      <Modal open={open} title={editing ? "Editar veículo" : "Novo veículo"} onClose={() => setOpen(false)}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div><Label>Marca</Label><Input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></div>
          <div><Label>Modelo</Label><Input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div>
          <div><Label>Placa</Label><Input value={form.placa} placeholder="ABC-1D23" onChange={(e) => setForm({ ...form, placa: maskPlate(e.target.value) })} /></div>
          <div><Label>Ano</Label><Input value={form.ano} placeholder="2025" onChange={(e) => setForm({ ...form, ano: maskYear(e.target.value) })} /></div>
          <div><Label>Cor</Label><Input value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} /></div>
          <div><Label>KM Atual</Label><Input value={form.km_atual} placeholder="Ex: 12.500" onChange={(e) => setForm({ ...form, km_atual: maskKmInput(e.target.value) })} /></div>
          <div><Label>Valor diária</Label><Input value={form.valor_diaria} placeholder="Ex: 189,90" onChange={(e) => setForm({ ...form, valor_diaria: maskCurrencyInput(e.target.value) })} /></div>
          <div><Label>Status</Label><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CarStatus })}><option value="disponivel">Disponível</option><option value="alugado">Alugado</option><option value="manutencao">Manutenção</option></Select></div>
          <div className="md:col-span-2"><Label>Observações</Label><Input value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
        </div>
        <div className="mt-4"><Button disabled={saving} onClick={save}>{saving ? "Salvando..." : "Salvar"}</Button></div>
      </Modal>
      <Modal open={!!historyTarget} title="Histórico do veículo" onClose={() => setHistoryTarget(null)}>
        <div className="mb-3 text-sm text-slate-700">
          <p>Veículo: <strong>{historyTarget?.marca} {historyTarget?.modelo} ({historyTarget?.placa})</strong></p>
          <p>KM atual: <strong>{formatKm(historyTarget?.km_atual)}</strong> | Status: <Badge status={historyTarget?.status || ""} /></p>
          <p>Total de locações: <strong>{history.length}</strong></p>
        </div>
        {!history.length ? (
          <EmptyState message="Este veículo ainda não possui locações registradas." />
        ) : (
          <ul className="space-y-2 text-sm">
            {history.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 p-3">
                <p><strong>{formatDate(item.data_retirada)}</strong> - {item.clientes?.nome || "Cliente não encontrado"}</p>
                <p>Status: <Badge status={item.status} /></p>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </Card>
  );
};
