const headers = { 'Content-Type': 'application/json' };
export async function fetchBoards() {
    const res = await fetch('/api/boards');
    if (!res.ok)
        throw new Error(`Failed to fetch boards: ${res.statusText}`);
    return res.json();
}
export async function fetchBoard(name) {
    const res = await fetch(`/api/boards/${encodeURIComponent(name)}`);
    if (!res.ok)
        throw new Error(`Failed to fetch board: ${res.statusText}`);
    return res.json();
}
export async function verifyItem(board, itemId) {
    const res = await fetch(`/api/boards/${encodeURIComponent(board)}/verify/${encodeURIComponent(itemId)}`, { method: 'POST' });
    if (!res.ok)
        throw new Error(`Failed to verify item: ${res.statusText}`);
    return res.json();
}
export async function triggerRun(board, iterations) {
    const res = await fetch(`/api/boards/${encodeURIComponent(board)}/run`, { method: 'POST', headers, body: JSON.stringify({ iterations }) });
    if (!res.ok)
        throw new Error(`Failed to trigger run: ${res.statusText}`);
    return res.json();
}
export async function stopBoard(board) {
    const res = await fetch(`/api/boards/${encodeURIComponent(board)}/stop`, { method: 'POST' });
    if (!res.ok)
        throw new Error(`Failed to stop board: ${res.statusText}`);
    return res.json();
}
export async function fetchConfig() {
    const res = await fetch('/api/config');
    if (!res.ok)
        throw new Error(`Failed to fetch config: ${res.statusText}`);
    return res.json();
}
export async function updateConfig(config) {
    const res = await fetch('/api/config', {
        method: 'PUT',
        headers,
        body: JSON.stringify(config),
    });
    if (!res.ok)
        throw new Error(`Failed to update config: ${res.statusText}`);
    return res.json();
}
//# sourceMappingURL=api.js.map