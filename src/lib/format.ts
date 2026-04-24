import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const formatCurrencyBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value ?? 0);

export const formatDateTime = (value?: string | null) => {
  if (!value) return "-";
  return format(new Date(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
};

export const formatDate = (value?: string | null) => {
  if (!value) return "-";
  return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
};

export const maskCpf = (raw: string) =>
  raw
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export const maskPhone = (raw: string) => {
  const v = raw.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export const formatKm = (value?: number | null) => {
  if (value === null || value === undefined) return "-";
  return `${new Intl.NumberFormat("pt-BR").format(value)} km`;
};

export const normalizePlate = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);

export const maskPlate = (raw: string) => {
  const normalized = normalizePlate(raw);
  if (normalized.length <= 3) return normalized;
  return `${normalized.slice(0, 3)}-${normalized.slice(3)}`;
};

export const unmaskPlate = (raw: string) => raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);

export const maskYear = (raw: string) => raw.replace(/\D/g, "").slice(0, 4);

export const maskCnh = (raw: string) => raw.replace(/\D/g, "").slice(0, 11);

export const maskKmInput = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("pt-BR").format(Number(digits));
};

export const unmaskKmInput = (raw: string) => Number(raw.replace(/\D/g, "") || 0);

export const maskCurrencyInput = (raw: string) => {
  const cleaned = raw.replace(/[^\d,]/g, "");
  const [intPart, decPart = ""] = cleaned.split(",");
  const intFormatted = intPart ? new Intl.NumberFormat("pt-BR").format(Number(intPart)) : "0";
  const decimals = decPart.slice(0, 2);
  return decimals.length ? `${intFormatted},${decimals}` : intFormatted;
};

export const unmaskCurrencyInput = (raw: string) => {
  const normalized = raw.replace(/\./g, "").replace(",", ".");
  return Number(normalized || 0);
};

export const friendlyAuthError = (message: string) => {
  if (message.toLowerCase().includes("invalid login credentials")) return "Email ou senha inválidos.";
  if (message.toLowerCase().includes("email not confirmed")) return "Confirme seu email antes de entrar.";
  return "Não foi possível entrar. Verifique os dados e tente novamente.";
};
