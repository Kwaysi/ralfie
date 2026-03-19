import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { triggerRun } from "../lib/api";
export default function RunDialog({ open, board, onClose }) {
    const [iterations, setIterations] = useState(10);
    const [started, setStarted] = useState(false);
    const [loading, setLoading] = useState(false);
    if (!open)
        return null;
    function handleBackdropClick(e) {
        if (e.target === e.currentTarget)
            onClose();
    }
    async function handleStart() {
        setLoading(true);
        try {
            await triggerRun(board, iterations);
            setStarted(true);
        }
        finally {
            setLoading(false);
        }
    }
    function handleClose() {
        setStarted(false);
        setIterations(10);
        onClose();
    }
    return (_jsx("div", { className: "fixed inset-0 bg-black/60 flex items-center justify-center z-50", onClick: handleBackdropClick, children: _jsx("div", { className: "bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6 w-80", children: started ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "text-[var(--success)] font-bold mb-3", children: "Run started" }), _jsxs("p", { className: "text-sm text-[var(--text-muted)] mb-4", children: ["Agent loop is running in the background for board", " ", _jsx("span", { className: "text-[var(--text)] font-mono", children: board }), "."] }), _jsx("button", { onClick: handleClose, className: "w-full px-3 py-2 rounded text-sm bg-[var(--border)] hover:opacity-80 cursor-pointer", children: "Close" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "font-bold mb-4", children: "Start Run" }), _jsx("label", { className: "block text-xs text-[var(--text-muted)] mb-1", children: "Max iterations" }), _jsx("input", { type: "number", min: 1, value: iterations, onChange: (e) => setIterations(Number(e.target.value)), className: "w-full px-3 py-2 rounded bg-[var(--bg)] border border-[var(--border)] text-sm mb-4 outline-none focus:border-[var(--accent)]" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: handleClose, className: "flex-1 px-3 py-2 rounded text-sm bg-[var(--border)] hover:opacity-80 cursor-pointer", children: "Cancel" }), _jsx("button", { onClick: handleStart, disabled: loading, className: "flex-1 px-3 py-2 rounded text-sm bg-[var(--accent)] text-white font-bold hover:opacity-80 cursor-pointer disabled:opacity-50", children: loading ? "Starting..." : "Start Run" })] })] })) }) }));
}
//# sourceMappingURL=RunDialog.js.map