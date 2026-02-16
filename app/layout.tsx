import type { ReactNode } from "react";

export const metadata = {
  title: "DutyMD - Supabase Check",
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "Inter, system-ui, sans-serif", background: "#f8fafc" }}>
        {children}
      </body>
    </html>
  );
}
