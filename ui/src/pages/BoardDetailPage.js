import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchBoard, verifyItem, stopBoard } from "../lib/api";
import { useWs } from "../lib/ws";
import PrdKanban from "../components/PrdKanban";
import PlanViewer from "../components/PlanViewer";
import ProgressTimeline from "../components/ProgressTimeline";
import RunDialog from "../components/RunDialog";
export default function BoardDetailPage() {
    const { name } = useParams();
    const [board, setBoard] = useState(null);
    const [error, setError] = useState(null);
    const [tab, setTab] = useState("prd");
    const [runOpen, setRunOpen] = useState(false);
    const load = useCallback(() => {
        if (!name)
            return;
        fetchBoard(name).then(setBoard).catch((e) => setError(e.message));
    }, [name]);
    useEffect(load, [load]);
    useWs(useCallback((ev) => {
        if (ev.board === name)
            load();
    }, [name, load]));
    async function handleVerify(itemId) {
        if (!name)
            return;
        await verifyItem(name, itemId);
        load();
    }
    if (error)
        return _jsx("div", { className: "text-[var(--danger)]", children: error });
    if (!board)
        return _jsx("div", { className: "text-[var(--text-muted)]", children: "Loading..." });
    const tabs = [
        { key: "prd", label: "PRD Items" },
        { key: "plan", label: "Plan" },
        { key: "progress", label: "Progress" },
    ];
    return (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold", children: board.meta.name }), board.meta.description && (_jsx("p", { className: "text-sm text-[var(--text-muted)]", children: board.meta.description }))] }), _jsxs("div", { className: "flex gap-2", children: [board.activeRuns > 0 && (_jsxs("button", { onClick: async () => {
                                    await stopBoard(board.meta.name);
                                    load();
                                }, className: "px-4 py-2 rounded text-sm bg-[var(--danger)] text-white font-bold hover:opacity-80 cursor-pointer", children: ["Stop (", board.activeRuns, ")"] })), _jsx("button", { onClick: () => setRunOpen(true), className: "px-4 py-2 rounded text-sm bg-[var(--accent)] text-white font-bold hover:opacity-80 cursor-pointer", children: "Run" })] })] }), _jsx("div", { className: "flex gap-1 mb-4 border-b border-[var(--border)]", children: tabs.map((t) => (_jsx("button", { onClick: () => setTab(t.key), className: `px-4 py-2 text-sm cursor-pointer border-b-2 -mb-px ${tab === t.key
                        ? "border-[var(--accent)] text-[var(--accent)] font-bold"
                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"}`, children: t.label }, t.key))) }), tab === "prd" && (_jsx(PrdKanban, { items: board.prd.items, onVerify: handleVerify })), tab === "plan" && _jsx(PlanViewer, { content: board.plan }), tab === "progress" && _jsx(ProgressTimeline, { content: board.progress }), _jsx(RunDialog, { open: runOpen, board: board.meta.name, onClose: () => setRunOpen(false) })] }));
}
//# sourceMappingURL=BoardDetailPage.js.map