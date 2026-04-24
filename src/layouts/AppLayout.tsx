import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, Car, ClipboardList, LayoutDashboard, LogOut, Menu, ScrollText, Search, Settings, Users, X, History } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { Button, Input } from "../components/ui";
import { useBranding } from "../hooks/useBranding";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/carros", label: "Carros", icon: Car },
  { to: "/clientes", label: "Clientes", icon: Users },
  { to: "/locacoes", label: "Locações", icon: ClipboardList },
  { to: "/contratos", label: "Contratos", icon: ScrollText },
  { to: "/relatorios", label: "Históricos", icon: History },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, logout } = useAuth();
  const { nomeLocadora, logoUrl } = useBranding();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const onLogout = async () => {
    if (!window.confirm("Deseja sair do sistema?")) return;
    await logout();
    navigate("/login");
  };

  const current = links.find((item) => item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to));
  const pageTitle = current?.label || "Painel";
  const userName = profile?.nome || profile?.email || "Usuário";
  const userEmail = profile?.email || "contato@locadora.com";
  const userRole = profile?.role === "admin" ? "Administrador" : "Operador";

  useEffect(() => {
    document.title = `${nomeLocadora} - ${pageTitle}`;
  }, [nomeLocadora, pageTitle]);

  return (
    <div className="flex min-h-screen bg-slate-100">
      {sidebarOpen && <button className="fixed inset-0 z-30 bg-slate-950/50 md:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={`no-print fixed z-40 h-screen w-[268px] overflow-y-auto border-r border-slate-700/50 bg-gradient-to-b from-[#0b1220] via-[#0f172a] to-[#131d33] p-5 text-slate-100 transition-transform md:static md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-7 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo da locadora" className="h-8 w-8 rounded-lg object-cover ring-1 ring-blue-400/30" />
            ) : (
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-600/20 text-blue-300 ring-1 ring-blue-400/30">
                <Car size={16} />
              </div>
            )}
            <h1 className="text-lg font-semibold tracking-tight">{nomeLocadora}</h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">Plataforma de gestão inteligente</p>
        </div>
        <nav className="space-y-1.5">
          {links.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-blue-600 text-white shadow-[0_8px_18px_rgba(37,99,235,0.35)]" : "text-slate-300 hover:bg-slate-700/50 hover:text-white"}`
              }
            >
              <item.icon size={17} /> {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-8 rounded-xl border border-slate-700/60 bg-slate-900/70 p-3">
          <p className="truncate text-sm font-medium text-slate-100">{userName}</p>
          <p className="truncate text-xs text-slate-400">{userRole}</p>
          <Button variant="outline" className="mt-3 w-full border-slate-600 bg-slate-800 text-slate-100 hover:bg-slate-700" onClick={onLogout}>
            <LogOut size={16} className="mr-2" /> Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 p-3 sm:p-5 md:p-7">
        <header className="no-print mb-6 rounded-2xl border border-slate-200/80 bg-white px-4 py-4 shadow-[0_8px_20px_rgba(15,23,42,0.05)] sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" className="md:hidden" onClick={() => setSidebarOpen((prev) => !prev)}>
                {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
              </Button>
              <div>
                <p className="text-sm text-slate-500">Painel administrativo</p>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">{pageTitle}</h2>
              </div>
            </div>
            <div className="flex w-full flex-wrap items-center justify-end gap-3 lg:w-auto">
              <div className="relative order-3 w-full sm:order-none sm:w-72 lg:w-80">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9" placeholder="Buscar no sistema..." />
              </div>
              <button className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50">
                <Bell size={17} />
              </button>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="max-w-44 truncate text-sm font-semibold text-slate-800">{userName}</p>
                <p className="max-w-44 truncate text-xs text-slate-500">{userEmail}</p>
              </div>
              </div>
            </div>
          </div>
        </header>
        <Outlet />
      </main>
    </div>
  );
};
