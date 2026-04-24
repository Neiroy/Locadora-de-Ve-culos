export const DEFAULT_BRAND_NAME = "JPVeiculos";

// Caminho web estável (servido pela pasta public).
export const DEFAULT_BRAND_LOGO_URL = "/brand-logo.jpeg";

export const normalizeLogoUrl = (value: unknown) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";

  // file:// local quebra no browser em vários cenários.
  if (trimmed.toLowerCase().startsWith("file://")) return "";

  const lower = trimmed.toLowerCase();
  const isHttp = lower.startsWith("http://") || lower.startsWith("https://");
  const isDataImage = lower.startsWith("data:image/");
  const isSafeRelative = trimmed.startsWith("/");
  if (!isHttp && !isDataImage && !isSafeRelative) return "";

  return trimmed;
};
