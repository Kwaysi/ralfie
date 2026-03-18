import { boardExists } from '../lib/board.js';
import { readPrd } from '../lib/prd.js';
import type { ItemStatus } from '@ralfie/shared';

const VALID_STATUSES: ItemStatus[] = ['pending', 'in_progress', 'done', 'failed', 'verified'];

export async function statusCommand(board: string, status: string, cwd?: string): Promise<void> {
  if (!VALID_STATUSES.includes(status as ItemStatus)) {
    console.error(`Invalid status: "${status}". Valid options: ${VALID_STATUSES.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  if (!(await boardExists(board, cwd))) {
    console.error(`Board not found: ${board}`);
    process.exitCode = 1;
    return;
  }

  const prd = await readPrd(board, cwd);
  const filtered = prd.items.filter((item) => item.status === status);

  if (filtered.length === 0) {
    console.log(`No items with status "${status}".`);
    return;
  }

  for (const item of filtered) {
    const agent = item.assigned_to ? ` [${item.assigned_to}]` : '';
    const comments = item.comments.length > 0 ? ` (${item.comments.length} comments)` : '';
    console.log(`${item.id}  ${item.category}  ${item.description}${agent}${comments}`);
  }
}
