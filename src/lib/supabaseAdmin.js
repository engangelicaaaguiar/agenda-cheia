import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const explicitEnable = process.env.SUPABASE_ENABLED === "true";

const hasPlaceholders =
  !url ||
  !key ||
  url.includes("SEU-PROJETO") ||
  key.includes("SEU_SERVICE_ROLE_KEY") ||
  !url.startsWith("http");

export const supabaseEnabled = explicitEnable && !hasPlaceholders;

export const supabaseAdmin = supabaseEnabled ? createClient(url, key) : null;
