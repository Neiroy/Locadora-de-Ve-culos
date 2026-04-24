import { useEffect, useState } from "react";
import { Button, Card, Input, Label, Modal, Badge, EmptyState } from "../components/ui";
import { supabase } from "../lib/supabase";
import type { Cliente, Locacao } from "../types/entities";
import { isValidCPF } from "../lib/validators";
import { maskCnh, maskCpf, maskPhone, maskPlate, onlyDigits, formatDate } from "../lib/format";
import toast from "react-hot-toast";
import { useDebouncedValue } from "../hooks/useDebouncedValue";

const initial = { nome: "", cpf: "", cnh: "", telefone: "", endereco: "" };
const normalizePersonName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export const ClientsPage = () => {
  const [items, setItems] = useState<Cliente[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [form, setForm] = useState(initial);
  const [history, setHistory] = useState<Locacao[]>([]);
  const [historyOwner, setHistoryOwner] = useState<Cliente | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("clientes").select("*").order("created_at", { ascending: false });
    if (debouncedSearch) query = query.or(`nome.ilike.%${debouncedSearch}%,cpf.ilike.%${onlyDigits(debouncedSearch)}%`);
    const { data, error } = await query;
    setLoading(false);
    if (error) return toast.error(error.message);
    setItems((data as Cliente[]) || []);
  };

  useEffect(() => {
    load();
  }, [debouncedSearch]);

  const openForm = (cliente?: Cliente) => {
    setEditing(cliente || null);
    setForm(
      cliente
        ? { nome: cliente.nome, cpf: maskCpf(cliente.cpf), cnh: maskCnh(cliente.cnh), telefone: cliente.telefone || "", endereco: cliente.endereco || "" }
        : initial,
    );
    setOpen(true);
  };

  const save = async () => {
    const payload = {
      ...form,
      nome: normalizePersonName(form.nome),
      cpf: onlyDigits(form.cpf),
      telefone: onlyDigits(form.telefone) || null,
      endereco: form.endereco.trim() || null,
    };
    if (!payload.nome || !payload.cnh) return toast.error("Nome e CNH são obrigatórios.");
    if (!isValidCPF(payload.cpf)) return toast.error("CPF inválido");
    if (payload.cnh.length < 11) return toast.error("CNH inválida");
    if (payload.telefone && payload.telefone.length < 10) return toast.error("Telefone inválido");
    setSaving(true);
    if (editing) {
      const { error } = await supabase.from("clientes").update(payload).eq("id", editing.id);
      if (error) {
        setSaving(false);
        return toast.error(error.message.includes("clientes_cpf_key") ? "Já existe cliente com este CPF." : error.message.includes("clientes_cnh_key") ? "Já existe cliente com esta CNH." : error.message);
      }
      toast.success("Cliente atualizado com sucesso");
    } else {
      const { error } = await supabase.from("clientes").insert(payload);
      if (error) {
        setSaving(false);
        return toast.error(error.message.includes("clientes_cpf_key") ? "Já existe cliente com este CPF." : error.message.includes("clientes_cnh_key") ? "Já existe cliente com esta CNH." : error.message);
      }
      toast.success("Cliente cadastrado com sucesso");
    }
    setSaving(false);
    setOpen(false);
    load();
  };

  const showHistory = async (cliente: Cliente) => {
    const { data, error } = await supabase
      .from("locacoes")
      .select("*,carros(marca,modelo,placa)")
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false });
    if (error) return toast.error(error.message);
    setHistoryOwner(cliente);
    setHistory((data as Locacao[]) || []);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-lg font-semibold text-slate-900">Clientes</h2>
          <Input placeholder="Buscar por nome ou CPF" className="w-full sm:max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Button onClick={() => openForm()}>Novo cliente</Button>
        </div>
        <div className="space-y-3 sm:hidden">
          {!loading && items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="font-semibold text-slate-800">{item.nome}</p>
              <p className="text-sm text-slate-500">{maskCpf(item.cpf)}</p>
              <p className="text-sm text-slate-500">CNH: {maskCnh(item.cnh)}</p>
              <p className="text-sm text-slate-500">Telefone: {item.telefone ? maskPhone(item.telefone) : "-"}</p>
              <p className="text-sm text-slate-500">Endereço: {item.endereco || "-"}</p>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" onClick={() => openForm(item)}>Editar</Button>
                <Button variant="outline" onClick={() => showHistory(item)}>Histórico</Button>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">CPF</th><th className="hidden px-4 py-3 sm:table-cell">CNH</th><th className="hidden px-4 py-3 lg:table-cell">Telefone</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
            <tbody>
              {!loading && items.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-medium text-slate-700">{item.nome}</td><td className="px-4 py-3 text-slate-600">{maskCpf(item.cpf)}</td><td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{maskCnh(item.cnh)}</td><td className="hidden px-4 py-3 text-slate-600 lg:table-cell">{item.telefone ? maskPhone(item.telefone) : "-"}</td>
                  <td className="space-x-2 px-4 py-3 text-right">
                    <Button variant="outline" onClick={() => openForm(item)}>Editar</Button>
                    <Button variant="outline" onClick={() => showHistory(item)}>Histórico</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {loading && <p className="py-5 text-center text-sm text-slate-500">Carregando clientes...</p>}
        {!loading && items.length === 0 && <EmptyState message="Nenhum cliente encontrado para os filtros atuais." />}
      </Card>
      <Card>
        <h3 className="mb-3 text-base font-semibold">Histórico do cliente</h3>
        {!history.length ? (
          <p className="text-sm text-slate-500">Selecione um cliente para visualizar o histórico.</p>
        ) : (
          <div className="space-y-2 text-sm">
            <p>Cliente selecionado: <strong>{historyOwner?.nome}</strong></p>
            <p>Total de locações: <strong>{history.length}</strong></p>
            <p>Última locação: <strong>{formatDate(history[0].data_retirada)}</strong></p>
            <p>Veículos alugados: <strong>{new Set(history.map((h) => h.carros?.placa)).size}</strong></p>
            <ul className="space-y-2 text-slate-600">
              {history.slice(0, 8).map((h) => (
                <li key={h.id} className="rounded-lg border border-slate-200 p-3">
                  <p>{h.carros?.marca} {h.carros?.modelo} - {h.carros?.placa ? maskPlate(h.carros.placa) : "-"}</p>
                  <p>{formatDate(h.data_retirada)} | <Badge status={h.status} /></p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
      <Modal open={open} title={editing ? "Editar cliente" : "Novo cliente"} onClose={() => setOpen(false)}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Nome</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
          <div><Label>CPF</Label><Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: maskCpf(e.target.value) })} /></div>
          <div><Label>CNH</Label><Input value={form.cnh} placeholder="Somente números" onChange={(e) => setForm({ ...form, cnh: maskCnh(e.target.value) })} /></div>
          <div className="md:col-span-2"><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: maskPhone(e.target.value) })} /></div>
          <div className="md:col-span-2"><Label>Endereço</Label><Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} /></div>
        </div>
        <div className="mt-4"><Button disabled={saving} onClick={save}>{saving ? "Salvando..." : "Salvar"}</Button></div>
      </Modal>
    </div>
  );
};
