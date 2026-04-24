import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { Button, Card, Input, Label } from "../components/ui";
import toast from "react-hot-toast";
import { friendlyAuthError } from "../lib/format";
import { useAuth } from "../hooks/useAuth";
import { Car, Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import { useBranding } from "../hooks/useBranding";

export const LoginPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const { nomeLocadora, logoUrl } = useBranding();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return toast.error("Preencha email e senha.");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(friendlyAuthError(error.message));
    toast.success("Login realizado com sucesso");
    navigate("/");
  };

  useEffect(() => {
    if (session) navigate("/");
  }, [session, navigate]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#0a1220] via-[#111a2f] to-[#111827] p-4">
      <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-10 right-10 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900/40 shadow-[0_25px_80px_rgba(2,6,23,0.45)] backdrop-blur md:grid-cols-2">
        <div className="hidden border-r border-slate-700/70 bg-gradient-to-b from-slate-900/80 to-slate-950/90 p-10 text-slate-100 md:flex md:flex-col md:justify-between">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-blue-200">
              {logoUrl ? <img src={logoUrl} alt="Logo da locadora" className="h-5 w-5 rounded object-cover" /> : <Car size={16} />}
              <span className="text-sm font-semibold">{nomeLocadora}</span>
            </div>
            <h1 className="text-3xl font-bold leading-tight">Gestão inteligente para locação de veículos</h1>
            <p className="mt-3 text-sm text-slate-300">
              Controle clientes, carros, locações e contratos em uma plataforma profissional, moderna e segura.
            </p>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            <p className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-300" /> Acesso protegido por autenticação segura</p>
            <p className="flex items-center gap-2"><ShieldCheck size={16} className="text-emerald-300" /> Painel premium pronto para operação real</p>
          </div>
        </div>

        <div className="p-5 md:p-10">
          <Card className="mx-auto w-full max-w-md border-slate-200/90 bg-white/95 p-7 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
            <div className="mb-6">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-blue-600">Acesso ao sistema</p>
              <h2 className="text-2xl font-bold text-slate-900">Entrar na plataforma</h2>
              <p className="mt-1 text-sm text-slate-500">Use seu email e senha para acessar o painel da locadora.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <Label>Email</Label>
                <div className="relative">
                  <Mail size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input autoFocus type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" />
                </div>
              </div>
              <div>
                <Label>Senha</Label>
                <div className="relative">
                  <Lock size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 pr-10" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="rounded border-slate-300" />
                  Lembrar acesso
                </label>
                <span className="text-blue-600">Acesso seguro</span>
              </div>
              <Button type="submit" className="w-full" disabled={loading || !email.trim() || !password.trim()}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Card>
          <p className="mt-4 text-center text-xs text-slate-400">Plataforma corporativa para gestão de locadora.</p>
        </div>
      </div>
    </div>
  );
};
