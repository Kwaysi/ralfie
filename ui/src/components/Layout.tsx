import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/boards", label: "Boards" },
  { to: "/settings", label: "Settings" },
];

export default function Layout() {
  return (
    <div className="flex h-screen">
      <aside className="w-56 border-r border-[var(--border)] flex flex-col shrink-0">
        <div className="p-4 text-lg font-bold tracking-tight text-[var(--accent)]">
          ralfie
        </div>
        <nav className="flex flex-col gap-1 px-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `px-3 py-2 rounded text-sm ${
                  isActive
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
