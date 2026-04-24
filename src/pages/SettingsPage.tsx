import { useEffect, useMemo, useState, type ChangeEvent, type ComponentType } from "react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { Button, Card, EmptyState, Input, Label, Modal, SectionTitle, Select } from "../components/ui";
import type { Profile, Role } from "../types/entities";
import { useAuth } from "../hooks/useAuth";
import { Shield, Building2, FileText, Settings2, Users, Lock } from "lucide-react";
import { DEFAULT_BRAND_LOGO_URL, DEFAULT_BRAND_NAME, normalizeLogoUrl } from "../lib/branding";
import { maskCpfCnpj, maskCurrencyInput, maskKmInput, maskPhone, unmaskCurrencyInput, unmaskKmInput } from "../lib/format";

type TabKey = "geral" | "locadora" | "contrato" | "locacao" | "usuarios" | "seguranca";
const BRANDING_BUCKET = "branding";
type SettingsRow = {
  id: string;
  singleton_key: string;
  general_settings: Record<string, unknown>;
  company_settings: Record<string, unknown>;
  contract_settings: Record<string, unknown>;
  rental_settings: Record<string, unknown>;
  security_settings: Record<string, unknown>;
};

const tabs: { key: TabKey; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { key: "geral", label: "Geral", icon: Settings2 },
  { key: "locadora", label: "Locadora", icon: Building2 },
  { key: "contrato", label: "Contrato", icon: FileText },
  { key: "locacao", label: "Locação", icon: Shield },
  { key: "usuarios", label: "Usuários", icon: Users },
  { key: "seguranca", label: "Segurança", icon: Lock },
];

const isAppSettingsMissing = (message: string) =>
  message.includes("Could not find the table 'public.app_settings'") || message.includes("relation \"public.app_settings\" does not exist");
const isAppSettingsForbidden = (message: string) =>
  message.toLowerCase().includes("permission denied") ||
  message.toLowerCase().includes("violates row-level security policy") ||
  message.toLowerCase().includes("row-level security");

export const SettingsPage = () => {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin" && profile?.status !== "inativo";
  const [activeTab, setActiveTab] = useState<TabKey>("geral");
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [general, setGeneral] = useState({ nomeSistema: DEFAULT_BRAND_NAME, moeda: "BRL", formatoData: "dd/MM/yyyy", fusoHorario: "America/Sao_Paulo" });
  const [company, setCompany] = useState({
    nomeLocadora: DEFAULT_BRAND_NAME,
    nomeFantasia: "",
    cpfCnpj: "",
    telefone: "",
    email: "",
    endereco: "",
    cidade: "",
    estado: "",
    logoUrl: DEFAULT_BRAND_LOGO_URL,
  });
  const [contract, setContract] = useState({
    nomeExibido: DEFAULT_BRAND_NAME,
    textoPadrao: "O CLIENTE declara receber o veículo em perfeitas condições de uso, comprometendo-se a devolvê-lo na data ajustada, responsabilizando-se por danos, multas, uso indevido e demais responsabilidades previstas na legislação aplicável.",
    observacoesPadrao: "",
    rodape: "Documento válido mediante assinatura das partes.",
    cidadeContrato: "",
    assinaturaEmpresa: DEFAULT_BRAND_NAME,
    habilitarImpressao: true,
    habilitarPdf: true,
  });
  const [rental, setRental] = useState({
    horaLimiteDevolucao: "18:00",
    cobrarDiariaExtra: true,
    exigirObservacaoDevolucao: false,
    permitirCancelamento: true,
    permitirEdicaoFinalizada: false,
    kmLivre: "",
    valorKmExcedente: "",
  });

  const [users, setUsers] = useState<Profile[]>([]);
  const [userModal, setUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [userForm, setUserForm] = useState({ nome: "", email: "", role: "atendente" as Role, status: "ativo" as "ativo" | "inativo", password: "" });
  const [securityForm, setSecurityForm] = useState({ novaSenha: "", confirmarSenha: "" });
  const [logoUploading, setLogoUploading] = useState(false);

  const tabTitle = useMemo(() => tabs.find((t) => t.key === activeTab)?.label || "Configurações", [activeTab]);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("app_settings").select("*").eq("singleton_key", "main").maybeSingle();
    if (error) {
      setLoading(false);
      if (isAppSettingsMissing(error.message)) {
        toast.error("Tabela de configurações não encontrada no Supabase. Execute o SQL de criação da app_settings.");
        return;
      }
      if (isAppSettingsForbidden(error.message)) {
        toast.error("Sem permissão para acessar Configurações. Apenas administradores podem alterar essa área.");
        return;
      }
      return toast.error(error.message);
    }

    let row = data as SettingsRow | null;
    if (!row) {
      const { data: created, error: createError } = await supabase.from("app_settings").insert({ singleton_key: "main" }).select("*").single();
      if (createError) {
        setLoading(false);
        if (isAppSettingsMissing(createError.message)) {
          toast.error("Tabela de configurações não encontrada no Supabase. Execute o SQL de criação da app_settings.");
          return;
        }
        if (isAppSettingsForbidden(createError.message)) {
          toast.error("Sem permissão para criar configurações. Apenas administradores podem alterar essa área.");
          return;
        }
        return toast.error(createError.message);
      }
      row = created as SettingsRow;
    }

    setSettingsId(row.id);
    setGeneral((prev) => ({ ...prev, ...(row.general_settings || {}) }));
    setCompany((prev) => {
      const dbCompany = (row.company_settings || {}) as Record<string, unknown>;
      const dbLogoUrl = normalizeLogoUrl(dbCompany.logoUrl);
      return {
        ...prev,
        ...dbCompany,
        nomeLocadora: (dbCompany.nomeLocadora as string) || prev.nomeLocadora,
        logoUrl: dbLogoUrl || prev.logoUrl,
      };
    });
    setContract((prev) => ({ ...prev, ...(row.contract_settings || {}) }));
    setRental((prev) => {
      const dbRental = (row?.rental_settings || {}) as Record<string, unknown>;
      return {
        ...prev,
        ...dbRental,
        valorKmExcedente:
          dbRental.valorKmExcedente === null || dbRental.valorKmExcedente === undefined || dbRental.valorKmExcedente === ""
            ? ""
            : maskCurrencyInput(String(dbRental.valorKmExcedente)),
        kmLivre:
          dbRental.kmLivre === null || dbRental.kmLivre === undefined || dbRental.kmLivre === ""
            ? ""
            : maskKmInput(String(dbRental.kmLivre)),
      };
    });
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) return toast.error("Sem permissão para listar usuários. Aplique o SQL atualizado.");
    setUsers((data as Profile[]) || []);
  };

  useEffect(() => {
    if (!isAdmin) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSettings();
    void loadUsers();
  }, [isAdmin]);

  const saveSection = async (section: "general_settings" | "company_settings" | "contract_settings" | "rental_settings", payload: Record<string, unknown>) => {
    if (!settingsId) return;
    setSaving(true);
    const { error } = await supabase.from("app_settings").update({ [section]: payload }).eq("id", settingsId);
    setSaving(false);
    if (error) {
      if (isAppSettingsMissing(error.message)) {
        return toast.error("Tabela de configurações ausente. Rode o SQL de criação da app_settings.");
      }
      if (isAppSettingsForbidden(error.message)) {
        return toast.error("Sem permissão para salvar Configurações. Apenas administradores podem alterar essa área.");
      }
      return toast.error(error.message);
    }
    toast.success("Configurações salvas com sucesso");
  };

  const openUserModal = (user?: Profile) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        nome: user.nome || "",
        email: user.email || "",
        role: (user.role as Role) || "atendente",
        status: user.status || "ativo",
        password: "",
      });
    } else {
      setEditingUser(null);
      setUserForm({ nome: "", email: "", role: "atendente", status: "ativo", password: "" });
    }
    setUserModal(true);
  };

  const saveUser = async () => {
    if (!userForm.nome || !userForm.email) return toast.error("Nome e email são obrigatórios.");

    if (editingUser) {
      const { error } = await supabase.from("profiles").update({
        nome: userForm.nome,
        role: userForm.role,
        status: userForm.status,
      }).eq("id", editingUser.id);
      if (error) return toast.error(error.message);
      toast.success("Usuário atualizado");
      setUserModal(false);
      void loadUsers();
      return;
    }

    toast.error("Criação de usuário pelo cliente foi desativada por segurança. Crie no painel Auth do Supabase.");
  };

  const changePassword = async () => {
    if (!securityForm.novaSenha || securityForm.novaSenha.length < 6) return toast.error("Nova senha deve ter pelo menos 6 caracteres.");
    if (securityForm.novaSenha !== securityForm.confirmarSenha) return toast.error("As senhas não conferem.");
    const { error } = await supabase.auth.updateUser({ password: securityForm.novaSenha });
    if (error) return toast.error(error.message);
    toast.success("Senha alterada com sucesso");
    setSecurityForm({ novaSenha: "", confirmarSenha: "" });
  };

  const onLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);

    const readAsDataUrl = () =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Falha ao carregar arquivo local."));
        reader.readAsDataURL(file);
      });

    try {
      const extension = (file.name.split(".").pop() || "png").toLowerCase();
      const filePath = `company/logo-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from(BRANDING_BUCKET)
        .upload(filePath, file, { cacheControl: "3600", upsert: true });

      if (uploadError) {
        const fallbackDataUrl = await readAsDataUrl();
        setCompany((prev) => ({ ...prev, logoUrl: fallbackDataUrl }));
        toast("Não foi possível enviar ao Storage. Usando upload local em base64.");
      } else {
        const { data: publicData } = supabase.storage.from(BRANDING_BUCKET).getPublicUrl(filePath);
        setCompany((prev) => ({ ...prev, logoUrl: publicData.publicUrl }));
        toast.success("Logo enviada para o Storage. Clique em salvar alterações.");
      }
    } catch {
      toast.error("Falha ao processar upload da logo.");
    } finally {
      setLogoUploading(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <EmptyState message="Acesso restrito: apenas administradores ativos podem acessar Configurações." />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-0">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-5">
          <SectionTitle title="Configurações" subtitle="Preferências da locadora e parâmetros do sistema" />
        </div>

        <div className="grid gap-0 md:grid-cols-[230px_1fr]">
          <aside className="border-b border-slate-200 p-3 md:border-b-0 md:border-r">
            <nav className="grid gap-1 sm:grid-cols-2 md:grid-cols-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
                    activeTab === tab.key ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <section className="p-3 sm:p-5">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-slate-900">{tabTitle}</h3>
            </div>

            {loading ? (
              <EmptyState message="Carregando configurações..." />
            ) : (
              <>
                {activeTab === "geral" && (
                  <Card className="space-y-3 p-4 sm:p-5">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
                      <div className="xl:col-span-4"><Label>Nome do sistema</Label><Input value={general.nomeSistema} onChange={(e) => setGeneral({ ...general, nomeSistema: e.target.value })} /></div>
                      <div className="xl:col-span-2"><Label>Moeda</Label><Select value={general.moeda} onChange={(e) => setGeneral({ ...general, moeda: e.target.value })}><option>BRL</option></Select></div>
                      <div className="xl:col-span-3"><Label>Formato de data</Label><Input value={general.formatoData} onChange={(e) => setGeneral({ ...general, formatoData: e.target.value })} /></div>
                      <div className="xl:col-span-3"><Label>Fuso horário</Label><Input value={general.fusoHorario} onChange={(e) => setGeneral({ ...general, fusoHorario: e.target.value })} /></div>
                    </div>
                    <Button className="w-full sm:w-auto" disabled={saving} onClick={() => saveSection("general_settings", general)}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
                  </Card>
                )}

                {activeTab === "locadora" && (
                  <Card className="space-y-3 p-4 sm:p-5">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
                      <div className="xl:col-span-4"><Label>Nome da locadora</Label><Input value={company.nomeLocadora} onChange={(e) => setCompany({ ...company, nomeLocadora: e.target.value })} /></div>
                      <div className="xl:col-span-4"><Label>Nome fantasia</Label><Input value={company.nomeFantasia} onChange={(e) => setCompany({ ...company, nomeFantasia: e.target.value })} /></div>
                      <div className="xl:col-span-4">
                        <Label>CPF/CNPJ</Label>
                        <Input
                          value={company.cpfCnpj}
                          onChange={(e) => setCompany({ ...company, cpfCnpj: maskCpfCnpj(e.target.value) })}
                          placeholder="000.000.000-00 ou 00.000.000/0000-00"
                        />
                      </div>
                      <div className="xl:col-span-4">
                        <Label>Telefone</Label>
                        <Input
                          value={company.telefone}
                          onChange={(e) => setCompany({ ...company, telefone: maskPhone(e.target.value) })}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div className="xl:col-span-4"><Label>Email</Label><Input value={company.email} onChange={(e) => setCompany({ ...company, email: e.target.value })} /></div>
                      <div className="xl:col-span-5"><Label>Endereço</Label><Input value={company.endereco} onChange={(e) => setCompany({ ...company, endereco: e.target.value })} /></div>
                      <div className="xl:col-span-2"><Label>Cidade</Label><Input value={company.cidade} onChange={(e) => setCompany({ ...company, cidade: e.target.value })} /></div>
                      <div className="xl:col-span-1"><Label>Estado</Label><Input value={company.estado} onChange={(e) => setCompany({ ...company, estado: e.target.value })} /></div>
                      <div className="md:col-span-2 xl:col-span-8"><Label>Logo (URL)</Label><Input value={company.logoUrl} onChange={(e) => setCompany({ ...company, logoUrl: e.target.value })} placeholder="https://..." /></div>
                      <div className="md:col-span-2 xl:col-span-4">
                        <Label>Upload de logo</Label>
                        <Input type="file" accept="image/*" onChange={onLogoUpload} />
                        <p className="mt-1 text-xs text-slate-500">A imagem é enviada para o Supabase Storage (bucket `branding`). Depois clique em salvar alterações.</p>
                      </div>
                    </div>
                    {logoUploading && <p className="text-sm text-slate-500">Carregando logo...</p>}
                    {company.logoUrl && <img src={company.logoUrl} alt="Logo da locadora" className="h-20 rounded-lg border border-slate-200 object-contain p-2" />}
                    <Button className="w-full sm:w-auto" disabled={saving} onClick={() => saveSection("company_settings", company)}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
                  </Card>
                )}

                {activeTab === "contrato" && (
                  <Card className="space-y-3 p-4 sm:p-5">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
                      <div className="xl:col-span-6"><Label>Nome exibido no contrato</Label><Input value={contract.nomeExibido} onChange={(e) => setContract({ ...contract, nomeExibido: e.target.value })} /></div>
                      <div className="xl:col-span-6"><Label>Cidade no contrato</Label><Input value={contract.cidadeContrato} onChange={(e) => setContract({ ...contract, cidadeContrato: e.target.value })} /></div>
                      <div className="md:col-span-2"><Label>Texto padrão do contrato</Label><textarea className="min-h-32 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={contract.textoPadrao} onChange={(e) => setContract({ ...contract, textoPadrao: e.target.value })} /></div>
                      <div className="md:col-span-2"><Label>Observações padrão</Label><textarea className="min-h-24 w-full rounded-xl border border-slate-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" value={contract.observacoesPadrao} onChange={(e) => setContract({ ...contract, observacoesPadrao: e.target.value })} /></div>
                      <div className="xl:col-span-7"><Label>Rodapé</Label><Input value={contract.rodape} onChange={(e) => setContract({ ...contract, rodape: e.target.value })} /></div>
                      <div className="xl:col-span-5"><Label>Assinatura da empresa</Label><Input value={contract.assinaturaEmpresa} onChange={(e) => setContract({ ...contract, assinaturaEmpresa: e.target.value })} /></div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">Habilitar impressão <input type="checkbox" checked={contract.habilitarImpressao} onChange={(e) => setContract({ ...contract, habilitarImpressao: e.target.checked })} /></label>
                      <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">Habilitar baixar PDF <input type="checkbox" checked={contract.habilitarPdf} onChange={(e) => setContract({ ...contract, habilitarPdf: e.target.checked })} /></label>
                    </div>
                    <Button className="w-full sm:w-auto" disabled={saving} onClick={() => saveSection("contract_settings", contract)}>{saving ? "Salvando..." : "Salvar alterações"}</Button>
                  </Card>
                )}

                {activeTab === "locacao" && (
                  <Card className="space-y-3 p-4 sm:p-5">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
                      <div className="xl:col-span-3"><Label>Hora limite devolução</Label><Input type="time" value={rental.horaLimiteDevolucao} onChange={(e) => setRental({ ...rental, horaLimiteDevolucao: e.target.value })} /></div>
                      <div className="xl:col-span-4">
                        <Label>KM livre (opcional)</Label>
                        <Input
                          value={rental.kmLivre}
                          placeholder="Ex: 1.000"
                          onChange={(e) => setRental({ ...rental, kmLivre: maskKmInput(e.target.value) })}
                        />
                      </div>
                      <div className="xl:col-span-5">
                        <Label>Valor por KM excedente</Label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">R$</span>
                          <Input
                            className="pl-10"
                            value={rental.valorKmExcedente}
                            placeholder="Ex: 1,50"
                            onChange={(e) => setRental({ ...rental, valorKmExcedente: maskCurrencyInput(e.target.value) })}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">Cobrar diária extra por atraso <input type="checkbox" checked={rental.cobrarDiariaExtra} onChange={(e) => setRental({ ...rental, cobrarDiariaExtra: e.target.checked })} /></label>
                      <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">Exigir observação na devolução <input type="checkbox" checked={rental.exigirObservacaoDevolucao} onChange={(e) => setRental({ ...rental, exigirObservacaoDevolucao: e.target.checked })} /></label>
                      <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">Permitir cancelamento <input type="checkbox" checked={rental.permitirCancelamento} onChange={(e) => setRental({ ...rental, permitirCancelamento: e.target.checked })} /></label>
                      <label className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2 text-sm">Permitir edição finalizada <input type="checkbox" checked={rental.permitirEdicaoFinalizada} onChange={(e) => setRental({ ...rental, permitirEdicaoFinalizada: e.target.checked })} /></label>
                    </div>
                    <Button
                      className="w-full sm:w-auto"
                      disabled={saving}
                      onClick={() =>
                        saveSection("rental_settings", {
                          ...rental,
                          kmLivre: rental.kmLivre.trim() === "" ? null : unmaskKmInput(rental.kmLivre),
                          valorKmExcedente:
                            rental.valorKmExcedente.trim() === "" ? null : unmaskCurrencyInput(rental.valorKmExcedente),
                        })
                      }
                    >
                      {saving ? "Salvando..." : "Salvar alterações"}
                    </Button>
                  </Card>
                )}

                {activeTab === "usuarios" && (
                  <Card className="space-y-3 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <SectionTitle title="Usuários do sistema" subtitle="Gerencie perfil e status de acesso" />
                      <Button className="w-full sm:w-auto" variant="outline" disabled title="Criação via painel Auth do Supabase">
                        Novo usuário desativado
                      </Button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <tr><th className="px-3 py-2">Nome</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Perfil</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Ações</th></tr>
                        </thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id} className="border-t border-slate-100">
                              <td className="px-3 py-2">{u.nome}</td>
                              <td className="px-3 py-2">{u.email}</td>
                              <td className="px-3 py-2">{u.role}</td>
                              <td className="px-3 py-2">{u.status || "ativo"}</td>
                              <td className="px-3 py-2 text-right"><Button className="w-full sm:w-auto" variant="outline" onClick={() => openUserModal(u)}>Editar</Button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}

                {activeTab === "seguranca" && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="space-y-3 p-4 sm:p-5">
                      <SectionTitle title="Alterar senha" subtitle="Atualize sua senha de acesso" />
                      <div><Label>Nova senha</Label><Input type="password" value={securityForm.novaSenha} onChange={(e) => setSecurityForm({ ...securityForm, novaSenha: e.target.value })} /></div>
                      <div><Label>Confirmar nova senha</Label><Input type="password" value={securityForm.confirmarSenha} onChange={(e) => setSecurityForm({ ...securityForm, confirmarSenha: e.target.value })} /></div>
                      <Button className="w-full sm:w-auto" onClick={changePassword}>Salvar nova senha</Button>
                    </Card>
                    <Card className="p-4 sm:p-5">
                      <SectionTitle title="Informações de segurança" subtitle="Boas práticas para proteger o acesso" />
                      <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-slate-600">
                        <li>Último acesso: {profile?.updated_at || profile?.created_at || "-"}</li>
                        <li>Use senha forte com no mínimo 8 caracteres.</li>
                        <li>Não compartilhe credenciais de acesso.</li>
                      </ul>
                    </Card>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </Card>

      <Modal open={userModal} title={editingUser ? "Editar usuário" : "Novo usuário"} onClose={() => setUserModal(false)}>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2"><Label>Nome</Label><Input value={userForm.nome} onChange={(e) => setUserForm({ ...userForm, nome: e.target.value })} /></div>
          <div><Label>Email</Label><Input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} /></div>
          <div><Label>Perfil</Label><Select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value as Role })}><option value="admin">Administrador</option><option value="atendente">Atendente</option></Select></div>
          <div><Label>Status</Label><Select value={userForm.status} onChange={(e) => setUserForm({ ...userForm, status: e.target.value as "ativo" | "inativo" })}><option value="ativo">Ativo</option><option value="inativo">Inativo</option></Select></div>
          {!editingUser && <div><Label>Senha inicial</Label><Input type="password" disabled value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} /></div>}
        </div>
        <div className="mt-4"><Button className="w-full sm:w-auto" onClick={saveUser}>{editingUser ? "Salvar usuário" : "Criar usuário"}</Button></div>
      </Modal>
    </div>
  );
};
