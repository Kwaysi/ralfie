import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBoards } from "../lib/api";
import { useWs } from "../lib/ws";
const STATUS_COLORS = {
    pending: "var(--text-muted)",
    in_progress: "var(--accent)",
    done: "var(--success)",
    failed: "var(--danger)",
    verified: "var(--success)",
};
function StatusCount({ label, count, color }) {
    return (_jsxs("span", { className: "text-xs", style: { color }, children: [count, " ", label] }));
}
export default function BoardListPage() {
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
    return (_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold mb-6", children: "Boards" }), boards.length === 0 ? (_jsxs("div", { className: "text-[var(--text-muted)] text-sm", children: ["No boards found. Run ", _jsx("code", { className: "text-[var(--accent)]", children: "ralf plan" }), " to create one."] })) : (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4", children: boards.map((board) => {
                    const items = board.prd.items;
                    const total = items.length;
                    const counts = {
                        pending: 0,
                        in_progress: 0,
                        done: 0,
                        failed: 0,
                        verified: 0,
                    };
                    for (const item of items) {
                        counts[item.status]++;
                    }
                    return (_jsxs(Link, { to: `/boards/${encodeURIComponent(board.meta.name)}`, className: "block bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 hover:border-[var(--accent)] transition-colors", children: [_jsx("div", { className: "font-bold mb-1", children: board.meta.name }), board.meta.description && (_jsx("div", { className: "text-xs text-[var(--text-muted)] mb-2", children: board.meta.description })), _jsxs("div", { className: "text-xs text-[var(--text-muted)] mb-3 flex items-center gap-2", children: [_jsxs("span", { children: [total, " items"] }), board.activeRuns > 0 && (_jsxs("span", { className: "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", style: { backgroundColor: 'color-mix(in srgb, var(--accent) 20%, transparent)', color: 'var(--accent)' }, children: [board.activeRuns, " agent", board.activeRuns > 1 ? 's' : '', " running"] }))] }), _jsxs("div", { className: "flex flex-wrap gap-x-3 gap-y-1", children: [_jsx(StatusCount, { label: "pending", count: counts.pending, color: STATUS_COLORS.pending }), _jsx(StatusCount, { label: "active", count: counts.in_progress, color: STATUS_COLORS.in_progress }), _jsx(StatusCount, { label: "done", count: counts.done, color: STATUS_COLORS.done }), _jsx(StatusCount, { label: "failed", count: counts.failed, color: STATUS_COLORS.failed }), _jsx(StatusCount, { label: "verified", count: counts.verified, color: STATUS_COLORS.verified })] })] }, board.meta.name));
                }) }))] }));
}
//# sourceMappingURL=BoardListPage.js.map