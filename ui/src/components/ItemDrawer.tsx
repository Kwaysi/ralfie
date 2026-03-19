import { useEffect, useMemo, useState } from "react";
import type { ItemStatus, PrdItem } from "@ralfie/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { verifyItem, resetItemApi, addCommentApi } from "../lib/api";
import { parseEntries } from "./ProgressTimeline";

interface ItemDrawerProps {
  item: PrdItem | null;
  onClose: () => void;
  boardName?: string;
  activeRuns?: number;
  onRefresh?: () => void;
  progressContent?: string;
}

const statusColors: Record<ItemStatus, string> = {
  pending: "var(--text-muted)",
  in_progress: "var(--accent)",
  done: "var(--success)",
  failed: "var(--danger)",
  verified: "var(--success)",
};

const statusLabels: Record<ItemStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  done: "Done",
  failed: "Failed",
  verified: "Verified",
};

function formatTimestamp(ts: string): string {
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

export default function ItemDrawer({ item, onClose, boardName, activeRuns = 0, onRefresh, progressContent }: ItemDrawerProps) {
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const progressEntry = useMemo(() => {
    if (!item || !progressContent) return null;
    const entries = parseEntries(progressContent);
    if (!entries) return null;
    return entries.find((e) => e.heading.startsWith(item.id)) ?? null;
  }, [item, progressContent]);

  useEffect(() => {
    if (!item) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  if (!item) return null;

  const color = statusColors[item.status];
  const readOnly = activeRuns > 0;
  const showVerify = item.status === "done" && !readOnly && boardName;
  const showReset = ["done", "failed", "in_progress"].includes(item.status) && item.status !== "verified" && !readOnly && boardName;
  const commentDisabled = readOnly || item.status === "verified" || !boardName;

  async function handleVerify() {
    if (!boardName) return;
    await verifyItem(boardName, item!.id);
    onRefresh?.();
  }

  async function handleReset() {
    if (!boardName) return;
    await resetItemApi(boardName, item!.id);
    onRefresh?.();
  }

  async function handleComment() {
    if (!boardName || !commentText.trim()) return;
    setSubmitting(true);
    try {
      await addCommentApi(boardName, item!.id, commentText.trim());
      setCommentText("");
      onRefresh?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex justify-end"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-[45vw] max-w-[720px] min-w-[360px] h-full bg-[var(--bg)] border-l border-[var(--border)] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg)] border-b border-[var(--border)] p-5 flex items-center gap-3">
          <span className="font-mono font-bold text-base">{item.id}</span>
          <span
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{ backgroundColor: color, color: "#000" }}
          >
            {statusLabels[item.status]}
          </span>
          <span className="px-2 py-0.5 rounded text-xs bg-[var(--border)] text-[var(--text-muted)]">
            {item.category}
          </span>
          <button
            onClick={onClose}
            className="ml-auto text-[var(--text-muted)] hover:text-[var(--text)] text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Action Buttons */}
          {(showVerify || showReset) && (
            <div className="flex gap-2">
              {showVerify && (
                <button
                  onClick={handleVerify}
                  className="px-3 py-1.5 rounded text-sm font-bold cursor-pointer"
                  style={{ backgroundColor: "var(--success)", color: "#000" }}
                >
                  Verify
                </button>
              )}
              {showReset && (
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded text-sm font-bold cursor-pointer"
                  style={{ backgroundColor: "var(--text-muted)", color: "#000" }}
                >
                  Move to Pending
                </button>
              )}
            </div>
          )}

          {/* Description */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Description
            </h3>
            <p className="text-sm leading-relaxed">{item.description}</p>
          </section>

          {/* User Story */}
          {item.user_story && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                User Story
              </h3>
              <p className="text-sm leading-relaxed italic text-[var(--text-muted)]">
                {item.user_story}
              </p>
            </section>
          )}

          {/* End State */}
          {item.end_state && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                End State
              </h3>
              <p className="text-sm leading-relaxed">{item.end_state}</p>
            </section>
          )}

          {/* Assigned Agent */}
          {item.assigned_to && (
            <section>
              <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
                Assigned To
              </h3>
              <span className="text-sm text-[var(--accent)]">{item.assigned_to}</span>
            </section>
          )}

          {/* Timestamps */}
          {(item.started_at || item.completed_at) && (
            <section className="flex gap-6 text-xs text-[var(--text-muted)]">
              {item.started_at && (
                <div>
                  <span className="uppercase tracking-wide font-bold">Started </span>
                  {formatTimestamp(item.started_at)}
                </div>
              )}
              {item.completed_at && (
                <div>
                  <span className="uppercase tracking-wide font-bold">Completed </span>
                  {formatTimestamp(item.completed_at)}
                </div>
              )}
            </section>
          )}

          {/* Steps to Verify */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Steps to Verify
            </h3>
            <ul className="space-y-1.5">
              {item.steps_to_verify.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 text-xs select-none">
                    {item.status === "verified" ? (
                      <span className="text-[var(--success)]">&#10003;</span>
                    ) : (
                      <span className="text-[var(--border)]">&#9675;</span>
                    )}
                  </span>
                  <span className="leading-relaxed">{step}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Progress */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Progress
            </h3>
            {progressEntry ? (
              <div
                className="rounded-lg border p-4 prose prose-invert max-w-none text-sm"
                style={{
                  backgroundColor: "var(--bg-card)",
                  borderColor: "var(--border)",
                }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {progressEntry.body}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-muted)]">No progress entry yet</p>
            )}
          </section>

          {/* Comments */}
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)] mb-2">
              Comments ({item.comments.length})
            </h3>
            {item.comments.length === 0 ? (
              <p className="text-sm text-[var(--text-muted)]">No comments yet</p>
            ) : (
              <div className="space-y-3">
                {item.comments.map((comment, i) => {
                  const isAgent = comment.session_id?.startsWith("ralfie-") ?? false;
                  return (
                    <div
                      key={i}
                      className="rounded-lg p-3 text-sm"
                      style={{
                        backgroundColor: isAgent
                          ? "rgba(99, 102, 241, 0.08)"
                          : "rgba(34, 197, 94, 0.08)",
                      }}
                    >
                      <div className="flex items-center gap-2 mb-1.5 text-xs text-[var(--text-muted)]">
                        <span>{isAgent ? "🤖" : "👤"}</span>
                        <span className="font-mono font-bold">
                          {comment.session_id ?? "unknown"}
                        </span>
                        <span className="ml-auto">
                          {formatTimestamp(comment.timestamp)}
                        </span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">
                        {comment.message}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Comment Input */}
            {!commentDisabled && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !submitting) handleComment(); }}
                  placeholder="Add a comment..."
                  className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)]"
                />
                <button
                  onClick={handleComment}
                  disabled={submitting || !commentText.trim()}
                  className="px-3 py-1.5 rounded text-sm font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "var(--accent)", color: "#000" }}
                >
                  Send
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
