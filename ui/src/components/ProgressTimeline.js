import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
function parseEntries(content) {
    const trimmed = content.trim();
    if (!trimmed)
        return null;
    // Split on --- separators (horizontal rules)
    const chunks = trimmed.split(/\n---\n/).filter((c) => c.trim());
    if (chunks.length <= 1 && !trimmed.includes("\n---"))
        return null;
    return chunks.map((chunk) => {
        const lines = chunk.trim().split("\n");
        // Extract ## heading as the card title
        const headingLine = lines.find((l) => l.startsWith("## "));
        const heading = headingLine ? headingLine.replace(/^##\s+/, "") : "Untitled";
        // Body is everything after the heading line
        const headingIdx = headingLine ? lines.indexOf(headingLine) : -1;
        const body = headingIdx >= 0
            ? lines
                .slice(headingIdx + 1)
                .join("\n")
                .trim()
            : chunk.trim();
        return { heading, body };
    });
}
function CollapsibleCard({ entry }) {
    const [expanded, setExpanded] = useState(false);
    return (_jsxs("div", { className: "rounded-lg border", style: {
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border)",
        }, children: [_jsxs("button", { type: "button", onClick: () => setExpanded(!expanded), className: "flex w-full items-center gap-2 px-4 py-3 text-left font-medium", style: { color: "var(--text)" }, children: [_jsx("span", { className: "inline-block transition-transform text-xs", style: {
                            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
                            color: "var(--text-muted)",
                        }, children: "\u25B6" }), _jsx("span", { children: entry.heading })] }), expanded && (_jsx("div", { className: "px-4 pb-4 prose prose-invert max-w-none", style: { borderTop: `1px solid var(--border)` }, children: _jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: entry.body }) }))] }));
}
export default function ProgressTimeline({ content }) {
    const [search, setSearch] = useState("");
    const entries = parseEntries(content);
    // Fallback: render as single markdown block
    if (!entries) {
        return (_jsx("div", { className: "rounded-lg border p-6 prose prose-invert max-w-none", style: {
                backgroundColor: "var(--bg-card)",
                borderColor: "var(--border)",
            }, children: content.trim() ? (_jsx(ReactMarkdown, { remarkPlugins: [remarkGfm], children: content })) : (_jsx("p", { style: { color: "var(--text-muted)" }, children: "No progress logged yet." })) }));
    }
    const filtered = search
        ? entries.filter((entry) => {
            const term = search.toLowerCase();
            return (entry.heading.toLowerCase().includes(term) ||
                entry.body.toLowerCase().includes(term));
        })
        : entries;
    return (_jsxs("div", { className: "flex flex-col gap-2", children: [_jsx("input", { type: "text", placeholder: "Search progress entries\u2026", value: search, onChange: (e) => setSearch(e.target.value), className: "rounded-lg border px-3 py-2 text-sm outline-none", style: {
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                } }), filtered.map((entry, i) => (_jsx(CollapsibleCard, { entry: entry }, i))), filtered.length === 0 && (_jsx("p", { className: "px-1 text-sm", style: { color: "var(--text-muted)" }, children: "No entries match your search." }))] }));
}
//# sourceMappingURL=ProgressTimeline.js.map