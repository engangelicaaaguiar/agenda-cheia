type DoctorSidebarProps = {
  currentPath: "/dashboard" | "/agenda" | "/plantoes" | "/recebimentos";
};

const links: Array<{ href: DoctorSidebarProps["currentPath"]; label: string }> = [
  { href: "/dashboard", label: "Jornada" },
  { href: "/agenda", label: "Agenda" },
  { href: "/plantoes", label: "Meus plantoes" },
  { href: "/recebimentos", label: "Recebimentos" },
];

export function DoctorSidebar({ currentPath }: DoctorSidebarProps) {
  return (
    <aside className="hidden border-r border-slate-200 bg-white p-5 lg:block">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">DutyMD</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Painel Medico</h2>
        </div>
        <nav className="space-y-1">
          {links.map((link) => (
            <a
              key={link.href}
              className={`block rounded-md px-3 py-2 text-sm ${
                currentPath === link.href
                  ? "bg-emerald-50 font-medium text-emerald-700"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
              href={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  );
}
