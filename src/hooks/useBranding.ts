import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { DEFAULT_BRAND_LOGO_URL, DEFAULT_BRAND_NAME, normalizeLogoUrl } from "../lib/branding";

type Branding = {
  nomeLocadora: string;
  logoUrl: string;
};

const DEFAULT_BRANDING: Branding = {
  nomeLocadora: DEFAULT_BRAND_NAME,
  logoUrl: DEFAULT_BRAND_LOGO_URL,
};

export const useBranding = () => {
  const [branding, setBranding] = useState<Branding>(DEFAULT_BRANDING);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("app_settings").select("company_settings").eq("singleton_key", "main").maybeSingle();
      if (error) return;
      const company = (data?.company_settings as Record<string, unknown> | undefined) || {};
      const dbLogoUrl = normalizeLogoUrl(company.logoUrl);
      setBranding({
        nomeLocadora: (company.nomeLocadora as string) || DEFAULT_BRANDING.nomeLocadora,
        logoUrl: dbLogoUrl || DEFAULT_BRANDING.logoUrl,
      });
    };
    void load();
  }, []);

  return branding;
};
