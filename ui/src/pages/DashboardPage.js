import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBoards } from "../lib/api";
import { useWs } from "../lib/ws";
import StatsCards from "../components/StatsCards";
import ItemsPerDayChart from "../components/ItemsPerDayChart";
export default function DashboardPage() {
    const [boards, setBoards] = useState([]);
    const [error, setError] = useState(null);
    const load = useCallback(() => {
        fetchBoards()
            .then((b) => {
            b.sort((a, z) => (z.meta.created_at ?? '').localeCompare(a.meta.created_at ?? ''));
            return b;
        })
            .then(setBoards)
            .catch((e) => setError(e.message));
    }, []);
    useEffect(load, [load]);
    useWs(useCallback(() => load(), [load]));
    if (error)
        return _jsx("div", { className: "text-[var(--danger)]", children: error });
    const allItems = boards.flatMap((b) => b.prd.items);
    return (_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold mb-6", children: "Dashboard" }), _jsx(StatsCards, { items: allItems }), _jsx("div", { className: "mt-6", children: _jsx(ItemsPerDayChart, { items: allItems }) }), _jsxs("div", { className: "mt-6", children: [_jsx("h2", { className: "text-sm text-[var(--text-muted)] mb-3", children: "Boards" }), boards.length === 0 ? (_jsxs("div", { className: "text-[var(--text-muted)] text-sm", children: ["No boards yet. Run ", _jsx("code", { className: "text-[var(--accent)]", children: "ralf plan" }), " to create one."] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: boards.map((board) => {
                            const total = board.prd.items.length;
                            const done = board.prd.items.filter((i) => i.status === "done" || i.status === "verified").length;
                            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                            return (_jsxs(Link, { to: `/boards/${encodeURIComponent(board.meta.name)}`, className: "block bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors", children: [_jsx("div", { className: "font-bold mb-1", children: board.meta.name }), board.meta.description && (_jsx("div", { className: "text-xs text-[var(--text-muted)] mb-3", children: board.meta.description })), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "flex-1 h-2 bg-[var(--bg)] rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-[var(--success)] rounded-full transition-all", style: { width: `${pct}%` } }) }), _jsxs("span", { className: "text-xs text-[var(--text-muted)] whitespace-nowrap", children: [done, "/", total, " (", pct, "%)"] })] })] }, board.meta.name));
                        }) }))] })] }));
}
//# sourceMappingURL=DashboardPage.js.map