import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { NavLink, Outlet } from "react-router-dom";
const navItems = [
    { to: "/", label: "Dashboard" },
    { to: "/boards", label: "Boards" },
    { to: "/settings", label: "Settings" },
];
export default function Layout() {
    return (_jsxs("div", { className: "flex h-screen", children: [_jsxs("aside", { className: "w-56 border-r border-[var(--border)] flex flex-col shrink-0", children: [_jsx("div", { className: "p-4 text-lg font-bold tracking-tight text-[var(--accent)]", children: "ralfie" }), _jsx("nav", { className: "flex flex-col gap-1 px-2", children: navItems.map((item) => (_jsx(NavLink, { to: item.to, end: item.to === "/", className: ({ isActive }) => `px-3 py-2 rounded text-sm ${isActive
                                ? "bg-[var(--accent)] text-white"
                                : "text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-card)]"}`, children: item.label }, item.to))) })] }), _jsx("main", { className: "flex-1 overflow-auto p-6", children: _jsx(Outlet, {}) })] }));
}
//# sourceMappingURL=Layout.js.map