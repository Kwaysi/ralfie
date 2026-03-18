import { boardExists } from '../lib/board.js';
import { verifyItem } from '../lib/prd.js';

export async function verifyCommand(board: string, itemId: string, cwd?: string): Promise<void> {
  if (!(await boardExists(board, cwd))) {
    console.error(`Board not found: ${board}`);
    process.exitCode = 1;
    return;
  }

  try {
    await verifyItem(board, itemId, 'cli', cwd);
    console.log(`Verified: ${itemId}`);
  } catch (err) {
    console.error((err as Error).message);
    process.exitCode = 1;
  }
}
