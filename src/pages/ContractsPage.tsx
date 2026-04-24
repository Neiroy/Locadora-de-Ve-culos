import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Input, EmptyState } from "../components/ui";
import { supabase } from "../lib/supabase";
import type { Locacao } from "../types/entities";
import { formatCurrencyBRL, formatDate } from "../lib/format";

export const ContractsPage = () => {
  const [items, setItems] = useState<Locacao[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.from("locacoes").select("*,clientes(nome),carros(marca,modelo,placa)").not("contrato_html", "is", null).order("created_at", { ascending: false });
      setLoading(false);
      const rows = ((data as Locacao[]) || []).filter((item) => {
        if (!search.trim()) return true;
        const term = search.toLowerCase();
        return item.clientes?.nome?.toLowerCase().includes(term) || item.carros?.placa?.toLowerCase().includes(term);
      });
      setItems(rows);
    };
    load();
  }, [search]);

  return (
    <Card className="p-0">
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="mr-auto px-4 pt-5 sm:px-5">
          <h2 className="text-lg font-semibold text-slate-900">Contratos</h2>
          <p className="text-sm text-slate-500">Histórico completo de contratos gerados</p>
        </div>
        <div className="w-full px-4 pt-2 sm:w-auto sm:px-5 sm:pt-5">
          <Input className="w-full sm:w-80" placeholder="Buscar por cliente ou placa" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="space-y-3 px-4 pb-4 sm:hidden">
        {items.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="font-semibold text-slate-800">{item.clientes?.nome}</p>
            <p className="text-sm text-slate-500">{item.carros?.marca} {item.carros?.modelo} ({item.carros?.placa})</p>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span>{formatDate(item.data_retirada)}</span>
              <span className="font-medium">{formatCurrencyBRL(item.valor_total)}</span>
            </div>
            <div className="mt-3">
              <Link to={`/contratos/${item.id}`}><Button variant="outline">Visualizar</Button></Link>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Veículo</th><th className="hidden px-4 py-3 sm:table-cell">Data</th><th className="hidden px-4 py-3 sm:table-cell">Valor</th><th className="px-4 py-3 text-right">Ação</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-700">{item.clientes?.nome}</td>
                <td className="px-4 py-3 text-slate-600">{item.carros?.marca} {item.carros?.modelo} ({item.carros?.placa})</td>
                <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{formatDate(item.data_retirada)}</td>
                <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">{formatCurrencyBRL(item.valor_total)}</td>
                <td className="px-4 py-3 text-right"><Link to={`/contratos/${item.id}`}><Button variant="outline">Visualizar</Button></Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && <p className="py-5 text-center text-sm text-slate-500">Carregando contratos...</p>}
      {!loading && items.length === 0 && <EmptyState message="Nenhum contrato encontrado." />}
    </Card>
  );
};
