import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Badge, Button, Card, EmptyState, SectionTitle, Select } from "../components/ui";
import { formatCurrencyBRL, formatDate } from "../lib/format";
import { Car, CheckCircle2, ClipboardList, Clock3, Users, XCircle } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";

type DashboardData = {
  totalCarros: number;
  carrosDisponiveis: number;
  carrosAlugados: number;
  totalClientes: number;
  locacoesAbertas: number;
  locacoesFinalizadas: number;
  ultimasLocacoes: { id: string; status: string; data_retirada: string; clientes: { nome: string }; carros: { placa: string; marca: string; modelo: string } }[];
  carrosRecentes: { id: string; marca: string; modelo: string; placa: string; ano: number; km_atual: number; valor_diaria: number; status: string }[];
  chart: { dia: string; total: number }[];
};

type RawRecentRental = {
  id: string;
  status: string;
  data_retirada: string;
  clientes: { nome: string }[] | { nome: string };
  carros: { placa: string; marca: string; modelo: string }[] | { placa: string; marca: string; modelo: string };
};

export const DashboardPage = () => {
  const [data, setData] = useState<DashboardData>({
    totalCarros: 0,
    carrosDisponiveis: 0,
    carrosAlugados: 0,
    totalClientes: 0,
    locacoesAbertas: 0,
    locacoesFinalizadas: 0,
    ultimasLocacoes: [],
    carrosRecentes: [],
    chart: [],
  });

  const buildChartData = (rows: { created_at: string }[]) => {
    const labels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });

    return labels.map((day) => ({
      dia: day.slice(8, 10),
      total: rows.filter((r) => r.created_at.slice(0, 10) === day).length,
    }));
  };

  useEffect(() => {
    const fetchData = async () => {
      const [{ count: totalCarros }, { count: carrosDisponiveis }, { count: carrosAlugados }, { count: totalClientes }, { count: locacoesAbertas }, { count: locacoesFinalizadas }, { data: ultimasLocacoes }, { data: carrosRecentes }, { data: chartData }] =
        await Promise.all([
          supabase.from("carros").select("*", { count: "exact", head: true }),
          supabase.from("carros").select("*", { count: "exact", head: true }).eq("status", "disponivel"),
          supabase.from("carros").select("*", { count: "exact", head: true }).eq("status", "alugado"),
          supabase.from("clientes").select("*", { count: "exact", head: true }),
          supabase.from("locacoes").select("*", { count: "exact", head: true }).eq("status", "aberta"),
          supabase.from("locacoes").select("*", { count: "exact", head: true }).eq("status", "finalizada"),
          supabase.from("locacoes").select("id,status,data_retirada,data_prevista_devolucao,valor_total,clientes(nome),carros(placa,marca,modelo)").order("created_at", { ascending: false }).limit(8),
          supabase.from("carros").select("id,marca,modelo,placa,ano,km_atual,valor_diaria,status").order("created_at", { ascending: false }).limit(6),
          supabase.from("locacoes").select("created_at").gte("created_at", new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()),
        ]);

      const formattedRecent = ((ultimasLocacoes as RawRecentRental[]) || []).map((item) => ({
        ...item,
        clientes: Array.isArray(item.clientes) ? item.clientes[0] : item.clientes,
        carros: Array.isArray(item.carros) ? item.carros[0] : item.carros,
      }));

      setData({
        totalCarros: totalCarros || 0,
        carrosDisponiveis: carrosDisponiveis || 0,
        carrosAlugados: carrosAlugados || 0,
        totalClientes: totalClientes || 0,
        locacoesAbertas: locacoesAbertas || 0,
        locacoesFinalizadas: locacoesFinalizadas || 0,
        ultimasLocacoes: formattedRecent,
        carrosRecentes: (carrosRecentes as DashboardData["carrosRecentes"]) || [],
        chart: buildChartData((chartData as { created_at: string }[]) || []),
      });
    };
    fetchData();
  }, []);

  const cards = [
    { label: "Total de veículos", value: data.totalCarros, icon: Car },
    { label: "Disponíveis", value: data.carrosDisponiveis, icon: CheckCircle2 },
    { label: "Alugados", value: data.carrosAlugados, icon: XCircle },
    { label: "Clientes cadastrados", value: data.totalClientes, icon: Users },
    { label: "Locações em aberto", value: data.locacoesAbertas, icon: Clock3 },
    { label: "Locações finalizadas", value: data.locacoesFinalizadas, icon: ClipboardList },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        {cards.map((card) => (
          <Card key={card.label} className="group min-h-[132px] rounded-2xl p-4 sm:min-h-[150px] sm:p-5 transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(15,23,42,0.08)]">
            <div className="mb-4 flex items-start justify-between">
              <p className="text-xs font-medium text-slate-500 sm:text-sm">{card.label}</p>
              <div className="rounded-xl bg-blue-50 p-2 text-blue-600 ring-1 ring-blue-100">
                <card.icon size={18} />
              </div>
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{card.value}</p>
            <p className="mt-2 text-xs text-slate-500">Atualizado em tempo real</p>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-12 xl:gap-5">
        <Card className="p-0 xl:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-4 sm:px-5">
            <SectionTitle title="Locações Recentes" subtitle="Acompanhamento das últimas operações" />
            <Button variant="outline" className="w-full sm:w-auto lg:min-w-44">Ver todas as locações</Button>
          </div>
          <div className="space-y-3 p-4 md:hidden">
            {data.ultimasLocacoes.map((item) => (
              <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="font-semibold text-slate-800">#{item.id.slice(0, 8)} • {item.clientes?.nome}</p>
                <p className="text-sm text-slate-500">{item.carros?.marca} {item.carros?.modelo}</p>
                <p className="text-sm text-slate-500">{formatDate(item.data_retirada)}</p>
                <div className="mt-2 flex items-center justify-between">
                  <Badge status={item.status} />
                  <span className="text-sm font-medium">{formatCurrencyBRL((item as { valor_total?: number }).valor_total || 0)}</span>
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
                  <th className="hidden px-4 py-3 md:table-cell">Retirada</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Devolução Prevista</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="hidden px-4 py-3 md:table-cell">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {data.ultimasLocacoes.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100 transition hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-medium text-slate-700">#{item.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-slate-600">{item.clientes?.nome}</td>
                    <td className="px-4 py-3 text-slate-600">{item.carros?.marca} {item.carros?.modelo}</td>
                    <td className="hidden px-4 py-3 text-slate-500 md:table-cell">{formatDate(item.data_retirada)}</td>
                    <td className="hidden px-4 py-3 text-slate-500 lg:table-cell">{formatDate((item as { data_prevista_devolucao?: string }).data_prevista_devolucao)}</td>
                    <td className="px-4 py-3"><Badge status={item.status} /></td>
                    <td className="hidden px-4 py-3 text-slate-600 md:table-cell">{formatCurrencyBRL((item as { valor_total?: number }).valor_total || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.ultimasLocacoes.length === 0 && <EmptyState message="Nenhuma locação registrada até o momento." />}
        </Card>

        <Card className="xl:col-span-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <SectionTitle title="Locações (7 dias)" subtitle="Evolução diária" />
            <Select className="h-9 w-full text-xs sm:w-auto sm:max-w-36">
              <option>Últimos 7 dias</option>
            </Select>
          </div>
          <div className="mt-4 h-52 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chart}>
                <defs>
                  <linearGradient id="colorLocacoes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="dia" tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#2563eb" fillOpacity={1} fill="url(#colorLocacoes)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

    </div>
  );
};
