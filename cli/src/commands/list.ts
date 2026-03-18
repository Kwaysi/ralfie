import { listBoards } from '../lib/board.js';
import { readPrd } from '../lib/prd.js';
import type { ItemStatus } from '@ralfie/shared';

export async function listCommand(cwd?: string): Promise<void> {
  const boards = await listBoards(cwd);

  if (boards.length === 0) {
    console.log('No boards found. Run "ralf plan" to create one.');
    return;
  }

  for (const meta of boards) {
    let total = 0;
    let done = 0;
    let active = 0;
    let failed = 0;

    try {
      const prd = await readPrd(meta.name, cwd);
      total = prd.items.length;
      for (const item of prd.items) {
        const s: ItemStatus = item.status;
        if (s === 'done' || s === 'verified') done++;
        else if (s === 'in_progress') active++;
        else if (s === 'failed') failed++;
      }
    } catch {
      // board has no PRD or it's unreadable
    }

    const barWidth = 20;
    const filled = total > 0 ? Math.round((done / total) * barWidth) : 0;
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

    console.log(`${meta.name}`);
    console.log(`  [${bar}] ${done}/${total} done  ${active} active  ${failed} failed`);
  }
}
