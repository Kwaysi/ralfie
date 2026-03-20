import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { fetchConfig, updateConfig, stopServer } from "../lib/api";
export default function SettingsPage() {
    const [config, setConfig] = useState(null);
    const [error, setError] = useState(null);
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [stopping, setStopping] = useState(false);
    useEffect(() => {
        fetchConfig().then(setConfig).catch((e) => setError(e.message));
    }, []);
    async function handleSave() {
        if (!config)
            return;
        setSaving(true);
        try {
            await updateConfig(config);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
        catch (e) {
            setError(e.message);
        }
        finally {
            setSaving(false);
        }
    }
    if (error)
        return _jsx("div", { className: "text-[var(--danger)]", children: error });
    if (!config)
        return _jsx("div", { className: "text-[var(--text-muted)]", children: "Loading..." });
    async function handleStop() {
        setStopping(true);
        try {
            await stopServer();
        }
        catch {
            // Expected — server shuts down and connection drops
        }
    }
    return (_jsxs("div", { children: [_jsx("h1", { className: "text-xl font-bold mb-6", children: "Settings" }), config.serve_pid && (_jsx("div", { className: "max-w-lg mb-6 bg-[var(--bg-card)] border border-[var(--border)] rounded p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm text-[var(--text-muted)]", children: "Server Status" }), _jsxs("div", { className: "text-sm mt-1", children: ["Running \u2014 PID", " ", _jsx("span", { className: "font-mono text-[var(--accent)]", children: config.serve_pid })] })] }), _jsx("button", { onClick: handleStop, disabled: stopping, className: "bg-[var(--danger)] text-white px-4 py-2 rounded text-sm hover:opacity-90 disabled:opacity-50", children: stopping ? "Stopping..." : "Stop Server" })] }) })), _jsxs("div", { className: "max-w-lg space-y-5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--text-muted)] mb-1", children: "User Name" }), _jsx("input", { type: "text", value: config.user, onChange: (e) => setConfig({ ...config, user: e.target.value }), className: "w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--text-muted)] mb-1", children: "Agent Command" }), _jsx("input", { type: "text", value: config.agent_command, onChange: (e) => setConfig({ ...config, agent_command: e.target.value }), className: "w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--text-muted)] mb-1", children: "Default Iterations" }), _jsx("input", { type: "number", value: config.default_iterations, onChange: (e) => setConfig({ ...config, default_iterations: parseInt(e.target.value, 10) || 1 }), min: 1, className: "w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--text-muted)] mb-1", children: "Serve Port" }), _jsx("input", { type: "number", value: config.serve_port, onChange: (e) => setConfig({ ...config, serve_port: parseInt(e.target.value, 10) || 3333 }), min: 1, max: 65535, className: "w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--text-muted)] mb-1", children: "Effort Level" }), _jsxs("select", { value: config.effort, onChange: (e) => setConfig({ ...config, effort: e.target.value }), className: "w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]", children: [_jsx("option", { value: "low", children: "Low" }), _jsx("option", { value: "medium", children: "Medium" }), _jsx("option", { value: "high", children: "High" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--text-muted)] mb-1", children: "Model" }), _jsxs("select", { value: config.model, onChange: (e) => setConfig({ ...config, model: e.target.value }), className: "w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)]", children: [_jsx("option", { value: "opus", children: "Opus" }), _jsx("option", { value: "sonnet", children: "Sonnet" }), _jsx("option", { value: "haiku", children: "Haiku" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm text-[var(--text-muted)] mb-1", children: "Feedback Loops (one command per line)" }), _jsx("textarea", { value: config.feedback_loops.join("\n"), onChange: (e) => setConfig({
                                    ...config,
                                    feedback_loops: e.target.value.split("\n").filter((l) => l.trim() !== ""),
                                }), rows: 4, className: "w-full bg-[var(--bg-card)] border border-[var(--border)] rounded px-3 py-2 text-sm text-[var(--text)] font-mono focus:outline-none focus:border-[var(--accent)] resize-y" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { onClick: handleSave, disabled: saving, className: "bg-[var(--accent)] text-white px-4 py-2 rounded text-sm hover:opacity-90 disabled:opacity-50", children: saving ? "Saving..." : "Save" }), saved && (_jsx("span", { className: "text-sm text-[var(--success)]", children: "Saved!" }))] })] })] }));
}
//# sourceMappingURL=SettingsPage.js.map