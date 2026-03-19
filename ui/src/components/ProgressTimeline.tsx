import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ProgressTimelineProps {
  content: string;
}

interface ProgressEntry {
  heading: string;
  body: string;
}

export function parseEntries(content: string): ProgressEntry[] | null {
  const trimmed = content.trim();
  if (!trimmed) return null;

  // Split on --- separators (horizontal rules)
  const chunks = trimmed.split(/\n---\n/).filter((c) => c.trim());
  if (chunks.length <= 1 && !trimmed.includes("\n---")) return null;

  return chunks.map((chunk) => {
    const lines = chunk.trim().split("\n");
    // Extract ## heading as the card title
    const headingLine = lines.find((l) => l.startsWith("## "));
    const heading = headingLine ? headingLine.replace(/^##\s+/, "") : "Untitled";
    // Body is everything after the heading line
    const headingIdx = headingLine ? lines.indexOf(headingLine) : -1;
    const body =
      headingIdx >= 0
        ? lines
            .slice(headingIdx + 1)
            .join("\n")
            .trim()
        : chunk.trim();
    return { heading, body };
  });
}

function CollapsibleCard({ entry }: { entry: ProgressEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-lg border"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border)",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left font-medium"
        style={{ color: "var(--text)" }}
      >
        <span
          className="inline-block transition-transform text-xs"
          style={{
            transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
            color: "var(--text-muted)",
          }}
        >
          ▶
        </span>
        <span>{entry.heading}</span>
      </button>
      {expanded && (
        <div
          className="px-4 pb-4 prose prose-invert max-w-none"
          style={{ borderTop: `1px solid var(--border)` }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {entry.body}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default function ProgressTimeline({ content }: ProgressTimelineProps) {
  const [search, setSearch] = useState("");
  const entries = parseEntries(content);

  // Fallback: render as single markdown block
  if (!entries) {
    return (
      <div
        className="rounded-lg border p-6 prose prose-invert max-w-none"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border)",
        }}
      >
        {content.trim() ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>No progress logged yet.</p>
        )}
      </div>
    );
  }

  const filtered = search
    ? entries.filter((entry) => {
        const term = search.toLowerCase();
        return (
          entry.heading.toLowerCase().includes(term) ||
          entry.body.toLowerCase().includes(term)
        );
      })
    : entries;

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        placeholder="Search progress entries…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="rounded-lg border px-3 py-2 text-sm outline-none"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border)",
          color: "var(--text)",
        }}
      />
      {filtered.map((entry, i) => (
        <CollapsibleCard key={i} entry={entry} />
      ))}
      {filtered.length === 0 && (
        <p className="px-1 text-sm" style={{ color: "var(--text-muted)" }}>
          No entries match your search.
        </p>
      )}
    </div>
  );
}
