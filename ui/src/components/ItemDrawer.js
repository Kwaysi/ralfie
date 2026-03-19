import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { verifyItem, resetItemApi, addCommentApi } from "../lib/api";
const statusColors = {
    pending: "var(--text-muted)",
    in_progress: "var(--accent)",
    done: "var(--success)",
    failed: "var(--danger)",
    verified: "var(--success)",
};
const statusLabels = {
    pending: "Pending",
    in_progress: "In Progress",
    done: "Done",
    failed: "Failed",
    verified: "Verified",
};
function formatTimestamp(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
    }) + " " + d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
    });
}
export default function ItemDrawer({ item, onClose, boardName, activeRuns = 0, onRefresh }) {
    const [commentText, setCommentText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    useEffect(() => {
        if (!item)
            return;
        function handleKeyDown(e) {
            if (e.key === "Escape")
                onClose();
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [item, onClose]);
    if (!item)
        return null;
    const color = statusColors[item.status];
    const readOnly = activeRuns > 0;
    const showVerify = item.status === "done" && !readOnly && boardName;
    const showReset = ["done", "failed", "in_progress"].includes(item.status) && item.status !== "verified" && !readOnly && boardName;
    const commentDisabled = readOnly || item.status === "verified" || !boardName;
    async function handleVerify() {
        if (!boardName)
            return;
        await verifyItem(boardName, item.id);
        onRefresh?.();
    }
    async function handleReset() {
        if (!boardName)
            return;
        await resetItemApi(boardName, item.id);
        onRefresh?.();
    }
    async function handleComment() {
        if (!boardName || !commentText.trim())
            return;
        setSubmitting(true);
        try {
            await addCommentApi(boardName, item.id, commentText.trim());
            setCommentText("");
            onRefresh?.();
        }
        finally {
            setSubmitting(false);
        }
    }
    return (_jsx("div", { className: "fixed inset-0 bg-black/40 z-50 flex justify-end", onClick: (e) => { if (e.target === e.currentTarget)
            onClose(); }, children: _jsxs("div", { className: "w-[45vw] max-w-[720px] min-w-[360px] h-full bg-[var(--bg)] border-l border-[var(--border)] overflow-y-auto", children: [_jsxs("div", { className: "sticky top-0 bg-[var(--bg)] border-b border-[var(--border)] p-5 flex items-center gap-3", children: [_jsx("span", { className: "font-mono font-bold text-base", children: item.id }), _jsx("span", { className: "px-2 py-0.5 rounded text-xs font-bold", style: { backgroundColor: color, color: "#000" }, children: statusLabels[item.status] }), _jsx("span", { className: "px-2 py-0.5 rounded text-xs bg-[var(--border)] text-[var(--text-muted)]", children: item.category }), _jsx("button", { onClick: onClose, className: "ml-auto text-[var(--text-muted)] hover:text-[var(--text)] text-lg cursor-pointer", children: "\u2715" })] }), _jsxs("div", { className: "p-5 space-y-5", children: [(showVerify || showReset) && (_jsxs("div", { className: "flex gap-2", children: [showVerify && (_jsx("button", { onClick: handleVerify, className: "px-3 py-1.5 rounded text-sm font-bold cursor-pointer", style: { backgroundColor: "var(--success)", color: "#000" }, children: "Verify" })), showReset && (_jsx("button", { onClick: handleReset, className: "px-3 py-1.5 rounded text-sm font-bold cursor-pointer", style: { backgroundColor: "var(--text-muted)", color: "#000" }, children: "Move to Pending" }))] })), _jsxs("section", { children: [_jsx("h3", { className: "text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2", children: "Description" }), _jsx("p", { className: "text-sm leading-relaxed", children: item.description })] }), item.user_story && (_jsxs("section", { children: [_jsx("h3", { className: "text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2", children: "User Story" }), _jsx("p", { className: "text-sm leading-relaxed italic text-[var(--text-muted)]", children: item.user_story })] })), item.end_state && (_jsxs("section", { children: [_jsx("h3", { className: "text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2", children: "End State" }), _jsx("p", { className: "text-sm leading-relaxed", children: item.end_state })] })), item.assigned_to && (_jsxs("section", { children: [_jsx("h3", { className: "text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2", children: "Assigned To" }), _jsx("span", { className: "text-sm text-[var(--accent)]", children: item.assigned_to })] })), (item.started_at || item.completed_at) && (_jsxs("section", { className: "flex gap-6 text-xs text-[var(--text-muted)]", children: [item.started_at && (_jsxs("div", { children: [_jsx("span", { className: "uppercase tracking-wide font-bold", children: "Started " }), formatTimestamp(item.started_at)] })), item.completed_at && (_jsxs("div", { children: [_jsx("span", { className: "uppercase tracking-wide font-bold", children: "Completed " }), formatTimestamp(item.completed_at)] }))] })), _jsxs("section", { children: [_jsx("h3", { className: "text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2", children: "Steps to Verify" }), _jsx("ul", { className: "space-y-1.5", children: item.steps_to_verify.map((step, i) => (_jsxs("li", { className: "flex items-start gap-2 text-sm", children: [_jsx("span", { className: "mt-0.5 text-xs select-none", children: item.status === "verified" ? (_jsx("span", { className: "text-[var(--success)]", children: "\u2713" })) : (_jsx("span", { className: "text-[var(--border)]", children: "\u25CB" })) }), _jsx("span", { className: "leading-relaxed", children: step })] }, i))) })] }), _jsxs("section", { children: [_jsxs("h3", { className: "text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2", children: ["Comments (", item.comments.length, ")"] }), item.comments.length === 0 ? (_jsx("p", { className: "text-sm text-[var(--text-muted)]", children: "No comments yet" })) : (_jsx("div", { className: "space-y-3", children: item.comments.map((comment, i) => {
                                        const isAgent = comment.session_id.startsWith("ralfie-");
                                        return (_jsxs("div", { className: "rounded-lg p-3 text-sm", style: {
                                                backgroundColor: isAgent
                                                    ? "rgba(99, 102, 241, 0.08)"
                                                    : "rgba(34, 197, 94, 0.08)",
                                            }, children: [_jsxs("div", { className: "flex items-center gap-2 mb-1.5 text-xs text-[var(--text-muted)]", children: [_jsx("span", { children: isAgent ? "🤖" : "👤" }), _jsx("span", { className: "font-mono font-bold", children: comment.session_id }), _jsx("span", { className: "ml-auto", children: formatTimestamp(comment.timestamp) })] }), _jsx("p", { className: "leading-relaxed whitespace-pre-wrap", children: comment.message })] }, i));
                                    }) })), !commentDisabled && (_jsxs("div", { className: "mt-3 flex gap-2", children: [_jsx("input", { type: "text", value: commentText, onChange: (e) => setCommentText(e.target.value), onKeyDown: (e) => { if (e.key === "Enter" && !submitting)
                                                handleComment(); }, placeholder: "Add a comment...", className: "flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]" }), _jsx("button", { onClick: handleComment, disabled: submitting || !commentText.trim(), className: "px-3 py-1.5 rounded text-sm font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed", style: { backgroundColor: "var(--accent)", color: "#000" }, children: "Send" })] }))] })] })] }) }));
}
//# sourceMappingURL=ItemDrawer.js.map