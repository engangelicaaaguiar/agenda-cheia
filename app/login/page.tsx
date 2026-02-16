"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import {
  LOGIN_AUDIENCE_CONFIG,
  getAudienceDefault,
  isLoginAudience,
  resolveAudienceRedirect,
  type LoginAudience,
} from "../../lib/auth/login-audience";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const audienceParam = searchParams.get("audience");
  const emailPrefill = searchParams.get("email");
  const oauthProvider = searchParams.get("oauth");
  const audience: LoginAudience = isLoginAudience(audienceParam) ? audienceParam : "doctor";

  const audienceConfig = getAudienceDefault(audience);
  const [email, setEmail] = useState(emailPrefill ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePasswordLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      setMessage("Nao foi possivel recuperar a sessao.");
      return;
    }

    let { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (audience === "doctor" && !profile?.role) {
      await fetch("/api/auth/bootstrap-doctor", { method: "POST" });
      const refreshed = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      profile = refreshed.data ?? profile;
    }

    const roleValue = typeof profile?.role === "string" ? profile.role : null;
    const target = resolveAudienceRedirect(audience, roleValue);
    setLoading(false);
    if (!target) {
      await supabase.auth.signOut();
      setMessage("Este usuario nao tem permissao para este tipo de login.");
      return;
    }

    router.push(target);
  }

  async function handleMagicLink() {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const redirectNext = encodeURIComponent(audienceConfig.defaultNext);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?audience=${audience}&next=${redirectNext}`,
      },
    });
    setLoading(false);
    setMessage(error ? error.message : "Magic link enviado para seu e-mail.");
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const redirectNext = encodeURIComponent(audienceConfig.defaultNext);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?audience=${audience}&next=${redirectNext}`,
      },
    });
    setLoading(false);
    if (error) setMessage(error.message);
  }

  useEffect(() => {
    if (emailPrefill) setEmail(emailPrefill);
  }, [emailPrefill]);

  useEffect(() => {
    if (oauthProvider === "google") {
      handleGoogleLogin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthProvider]);

  async function handleDoctorSignup() {
    if (audience !== "doctor") {
      setMessage("Cadastro direto esta disponivel apenas para perfil Medico.");
      return;
    }

    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const redirectNext = encodeURIComponent("/onboarding");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?audience=doctor&next=${redirectNext}`,
        data: { role: "DOCTOR" },
      },
    });
    if (error) {
      setLoading(false);
      setMessage(error.message);
      return;
    }

    if (data.session) {
      await fetch("/api/auth/bootstrap-doctor", { method: "POST" });
      setLoading(false);
      router.push("/onboarding");
      return;
    }

    setLoading(false);
    setMessage("Conta criada. Verifique seu e-mail para confirmar e concluir o cadastro.");
  }

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Login DutyMD</h1>
        <p className="mt-1 text-sm text-slate-600">Escolha o tipo de acesso e entre com senha ou magic link.</p>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {Object.entries(LOGIN_AUDIENCE_CONFIG).map(([key, config]) => (
            <a
              key={key}
              href={`/login?audience=${key}`}
              className={`rounded-md border px-2 py-2 text-center text-xs font-medium ${
                audience === key ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-700"
              }`}
            >
              {config.label}
            </a>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">{audienceConfig.description}</p>

        <form className="mt-5 space-y-3" onSubmit={handlePasswordLogin}>
          <input
            type="email"
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            placeholder="voce@empresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            type="password"
            className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm"
            placeholder="Sua senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="h-10 w-full rounded-md bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? "Entrando..." : "Entrar com senha"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleMagicLink}
          disabled={loading || !email}
          className="mt-3 h-10 w-full rounded-md border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          Enviar magic link
        </button>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading}
          className="mt-3 h-10 w-full rounded-md border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          Continuar com Google
        </button>

        {audience === "doctor" ? (
          <button
            type="button"
            onClick={handleDoctorSignup}
            disabled={loading || !email || !password}
            className="mt-3 h-10 w-full rounded-md border border-emerald-300 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
          >
            Criar conta medica
          </button>
        ) : null}

        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </section>
    </main>
  );
}
