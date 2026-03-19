import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const columns = [
    { status: "pending", label: "Pending", color: "var(--text-muted)" },
    { status: "in_progress", label: "In Progress", color: "var(--accent)" },
    { status: "done", label: "Done", color: "var(--success)" },
    { status: "failed", label: "Failed", color: "var(--danger)" },
    { status: "verified", label: "Verified", color: "var(--success)" },
];
export default function PrdKanban({ items, onVerify }) {
    return (_jsx("div", { className: "grid grid-cols-5 gap-3 items-start", children: columns.map((col) => {
            const colItems = items.filter((i) => i.status === col.status);
            return (_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "text-xs font-bold uppercase tracking-wide mb-3 flex items-center justify-between", style: { color: col.color }, children: [_jsx("span", { children: col.label }), _jsx("span", { className: "text-[var(--text-muted)] font-normal", children: colItems.length })] }), _jsx("div", { className: "flex flex-col gap-2", children: colItems.map((item) => (_jsx(ItemCard, { item: item, onVerify: item.status === "done" ? () => onVerify(item.id) : undefined }, item.id))) })] }, col.status));
        }) }));
}
function ItemCard({ item, onVerify, }) {
    return (_jsxs("div", { className: "bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 text-xs", children: [_jsx("div", { className: "font-bold font-mono mb-1", children: item.id }), _jsx("div", { className: "text-[var(--text-muted)] mb-1", children: item.category }), _jsx("div", { className: "mb-2 leading-relaxed", children: item.description }), item.assigned_to && (_jsxs("div", { className: "text-[var(--accent)] mb-1 truncate", children: ["\u26A1 ", item.assigned_to] })), _jsxs("div", { className: "flex items-center justify-between", children: [item.comments.length > 0 && (_jsxs("span", { className: "text-[var(--text-muted)]", children: ["\uD83D\uDCAC ", item.comments.length] })), onVerify && (_jsx("button", { onClick: onVerify, className: "ml-auto px-2 py-1 rounded text-xs bg-[var(--success)] text-black font-bold hover:opacity-80 cursor-pointer", children: "Verify" }))] })] }));
}
//# sourceMappingURL=PrdKanban.js.map