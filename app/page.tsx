import { createSupabaseServerClient } from "../lib/supabase/server";

export const dynamic = "force-dynamic";

type CheckResult = {
  ok: boolean;
  message: string;
  rows: number;
};

async function checkSupabaseConnection(): Promise<CheckResult> {
  try {
    const supabase = createSupabaseServerClient();

    const { data, error } = await supabase.from("organizations").select("id").limit(1);

    if (error) {
      return {
        ok: false,
        message: error.message,
        rows: 0,
      };
    }

    return {
      ok: true,
      message: "Conexao Supabase ativa e query executada com sucesso.",
      rows: data?.length ?? 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado ao conectar no Supabase.";
    return {
      ok: false,
      message,
      rows: 0,
    };
  }
}

export default async function HomePage() {
  const result = await checkSupabaseConnection();

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
      <section
        style={{
          width: "100%",
          maxWidth: "760px",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "16px",
          padding: "24px",
        }}
      >
        <h1 style={{ marginTop: 0, marginBottom: "10px" }}>DutyMD - Validador de Conexao Supabase</h1>
        <p style={{ marginTop: 0, color: "#475569" }}>
          Esta pagina executa uma query server-side usando <code>@supabase/ssr</code>.
        </p>

        <div
          style={{
            marginTop: "16px",
            borderRadius: "12px",
            padding: "14px",
            background: result.ok ? "#f0fdf4" : "#fef2f2",
            border: `1px solid ${result.ok ? "#86efac" : "#fecaca"}`,
            color: result.ok ? "#166534" : "#991b1b",
          }}
        >
          <strong>Status: {result.ok ? "OK" : "FALHA"}</strong>
          <p style={{ marginBottom: 0 }}>{result.message}</p>
          {result.ok ? <p style={{ marginBottom: 0 }}>Linhas retornadas: {result.rows}</p> : null}
        </div>

        <ul style={{ marginTop: "18px", color: "#475569" }}>
          <li>
            <code>NEXT_PUBLIC_SUPABASE_URL</code> e <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> devem estar definidos.
          </li>
          <li>
            A tabela <code>organizations</code> deve existir no Supabase.
          </li>
        </ul>
      </section>
    </main>
  );
}
