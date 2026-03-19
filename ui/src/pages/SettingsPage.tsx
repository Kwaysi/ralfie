import { useEffect, useState } from "react";
import type { RalfieConfig, EffortLevel, AgentModel } from "@ralfie/shared";
import { fetchConfig, updateConfig, stopServer } from "../lib/api";

export default function SettingsPage() {
  const [config, setConfig] = useState<RalfieConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    fetchConfig().then(setConfig).catch((e) => setError(e.message));
  }, []);

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      await updateConfig(config);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (error) return <div className="text-[var(--danger)]">{error}</div>;
  if (!config) return <div className="text-[var(--text-muted)]">Loading...</div>;

  async function handleStop() {
    setStopping(true);
    try {
      await stopServer();
    } catch {
      // Expected — server shuts down and connection drops
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Settings</h1>

      {config.serve_pid && (
        <div className="max-w-lg mb-6 bg-[var(--bg-card)] border border-[var(--border)] rounded p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-[var(--text-muted)]">Server Status</div>
              <div className="text-sm mt-1">
                Running — PID{" "}
                <span className="font-mono text-[var(--accent)]">{config.serve_pid}</span>
              </div>
            </div>
            <button
              onClick={handleStop}
              disabled={stopping}
              className="bg-[var(--danger)] text-white px-4 py-2 rounded text-sm hover:opacity-90 disabled:opacity-50"
            >
              {stopping ? "Stopping..." : "Stop Server"}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-lg space-y-5">
        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1">
            User Name
          </label>
          <input
            type="text"
            value={config.user}
            onChange={(e) => setConfig({ ...config, user: e.target.value })}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1">
            Agent Command
          </label>
          <input
            type="text"
            value={config.agent_command}
            onChange={(e) => setConfig({ ...config, agent_command: e.target.value })}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1">
            Default Iterations
          </label>
          <input
            type="number"
            value={config.default_iterations}
            onChange={(e) =>
              setConfig({ ...config, default_iterations: parseInt(e.target.value, 10) || 1 })
            }
            min={1}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1">
            Serve Port
          </label>
          <input
            type="number"
            value={config.serve_port}
            onChange={(e) =>
              setConfig({ ...config, serve_port: parseInt(e.target.value, 10) || 3333 })
            }
            min={1}
            max={65535}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1">
            Effort Level
          </label>
          <select
            value={config.effort}
            onChange={(e) => setConfig({ ...config, effort: e.target.value as EffortLevel })}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1">
            Model
          </label>
          <select
            value={config.model}
            onChange={(e) => setConfig({ ...config, model: e.target.value as AgentModel })}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]"
          >
            <option value="opus">Opus</option>
            <option value="sonnet">Sonnet</option>
            <option value="haiku">Haiku</option>
          </select>
        </div>

        <div>
          <label className="block text-sm text-[var(--text-muted)] mb-1">
            Feedback Loops (one command per line)
          </label>
          <textarea
            value={config.feedback_loops.join("\n")}
            onChange={(e) =>
              setConfig({
                ...config,
                feedback_loops: e.target.value.split("\n").filter((l) => l.trim() !== ""),
              })
            }
            rows={4}
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)] resize-y"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[var(--accent)] text-white px-4 py-2 rounded text-sm hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {saved && (
            <span className="text-sm text-[var(--success)]">Saved!</span>
          )}
        </div>
      </div>
    </div>
  );
}
