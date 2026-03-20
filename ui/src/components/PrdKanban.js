import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import ItemDrawer from "./ItemDrawer";
const columns = [
    { status: "pending", label: "Pending", color: "var(--text-muted)" },
    { status: "in_progress", label: "In Progress", color: "var(--accent)" },
    { status: "done", label: "Done", color: "var(--success)" },
    { status: "failed", label: "Failed", color: "var(--danger)" },
    { status: "verified", label: "Verified", color: "var(--success)" },
];
function sortColumnItems(items, status) {
    const key = status === "in_progress" ? "started_at" :
        status === "done" || status === "verified" ? "completed_at" :
            null;
    if (!key)
        return; // pending and failed keep array order
    items.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        if (!aVal && !bVal)
            return 0;
        if (!aVal)
            return 1;
        if (!bVal)
            return -1;
        return bVal.localeCompare(aVal);
    });
}
export default function PrdKanban({ items, onVerify, onRefresh, boardName, activeRuns, progressContent }) {
    const [selectedId, setSelectedId] = useState(null);
    const selectedItem = selectedId ? items.find((i) => i.id === selectedId) ?? null : null;
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "grid grid-cols-5 gap-3 h-full", children: columns.map((col) => {
                    const colItems = items.filter((i) => i.status === col.status);
                    sortColumnItems(colItems, col.status);
                    return (_jsxs("div", { className: "min-w-0 flex flex-col min-h-0", children: [_jsxs("div", { className: "text-xs font-bold uppercase tracking-wide mb-3 flex items-center justify-between shrink-0", style: { color: col.color }, children: [_jsx("span", { children: col.label }), _jsx("span", { className: "text-[var(--text-muted)] font-normal", children: colItems.length })] }), _jsx("div", { className: "flex flex-col gap-2 overflow-y-auto min-h-0 flex-1", children: colItems.map((item) => (_jsx(ItemCard, { item: item, onClick: () => setSelectedId(item.id), onVerify: item.status === "done" && activeRuns === 0 ? () => onVerify(item.id) : undefined }, item.id))) })] }, col.status));
                }) }), _jsx(ItemDrawer, { item: selectedItem, onClose: () => setSelectedId(null), boardName: boardName, activeRuns: activeRuns, onRefresh: onRefresh, progressContent: progressContent })] }));
}
function ItemCard({ item, onClick, onVerify, }) {
    return (_jsxs("div", { className: "bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 text-xs cursor-pointer hover:border-[var(--accent)] transition-colors", onClick: onClick, children: [_jsx("div", { className: "font-bold font-mono mb-1", children: item.id }), _jsx("div", { className: "text-[var(--text-muted)] mb-1", children: item.category }), _jsx("div", { className: "mb-2 leading-relaxed line-clamp-3", children: item.description }), item.assigned_to && (_jsxs("div", { className: "text-[var(--accent)] mb-1 truncate", children: ["\u26A1 ", item.assigned_to] })), _jsxs("div", { className: "flex items-center justify-between", children: [item.comments.length > 0 && (_jsxs("span", { className: "text-[var(--text-muted)]", children: ["\uD83D\uDCAC ", item.comments.length] })), onVerify && (_jsx("button", { onClick: (e) => { e.stopPropagation(); onVerify(); }, className: "ml-auto px-2 py-1 rounded text-xs bg-[var(--success)] text-black font-bold hover:opacity-80 cursor-pointer", children: "Verify" }))] })] }));
}
//# sourceMappingURL=PrdKanban.js.map