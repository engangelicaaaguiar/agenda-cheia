export type LoginAudience = "doctor" | "clinic" | "platform_admin";

type AudienceConfig = {
  label: string;
  description: string;
  defaultNext: string;
  allowedRoles: string[];
};

export const LOGIN_AUDIENCE_CONFIG: Record<LoginAudience, AudienceConfig> = {
  doctor: {
    label: "Medicos",
    description: "Acesse agenda, plantoes e ganhos.",
    defaultNext: "/plantoes",
    allowedRoles: ["DOCTOR"],
  },
  clinic: {
    label: "Clinicas",
    description: "Acesse a operacao da clinica e equipe.",
    defaultNext: "/dashboard",
    allowedRoles: ["ADMIN", "STAFF", "CLINIC_ADMIN"],
  },
  platform_admin: {
    label: "Administradores",
    description: "Acesse a administracao global da plataforma.",
    defaultNext: "/dashboard",
    allowedRoles: ["PLATFORM_ADMIN", "SUPER_ADMIN"],
  },
};

export function isLoginAudience(value: string | null): value is LoginAudience {
  return value === "doctor" || value === "clinic" || value === "platform_admin";
}

export function getAudienceDefault(audience: LoginAudience): AudienceConfig {
  return LOGIN_AUDIENCE_CONFIG[audience];
}

export function resolveAudienceRedirect(audience: LoginAudience, roleValue: string | null): string | null {
  const config = LOGIN_AUDIENCE_CONFIG[audience];

  if (audience === "doctor" && !roleValue) {
    return "/onboarding";
  }

  if (!roleValue) {
    return null;
  }

  if (!config.allowedRoles.includes(roleValue)) {
    return null;
  }

  return config.defaultNext;
}
