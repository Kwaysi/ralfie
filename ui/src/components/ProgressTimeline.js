import { jsx as _jsx } from "react/jsx-runtime";
import ReactMarkdown from "react-markdown";
export default function ProgressTimeline({ content }) {
    return (_jsx("div", { className: "rounded-lg border p-6 prose prose-invert max-w-none", style: {
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border)",
        }, children: content.trim() ? (_jsx(ReactMarkdown, { children: content })) : (_jsx("p", { style: { color: "var(--text-muted)" }, children: "No progress logged yet." })) }));
}
//# sourceMappingURL=ProgressTimeline.js.map