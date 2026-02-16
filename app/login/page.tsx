"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handlePasswordLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    setMessage(error ? error.message : "Login realizado com sucesso.");
  }

  async function handleMagicLink() {
    setLoading(true);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    setMessage(error ? error.message : "Magic link enviado para seu e-mail.");
  }

  return (
    <main className="min-h-screen grid place-items-center bg-slate-50 p-6">
      <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Login DutyMD</h1>
        <p className="mt-1 text-sm text-slate-600">Acesse com senha ou receba magic link.</p>

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

        {message ? <p className="mt-3 text-sm text-slate-700">{message}</p> : null}
      </section>
    </main>
  );
}
