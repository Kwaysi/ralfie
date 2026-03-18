import { boardExists } from '../lib/board.js';
import { clearStaleLocks } from '../lib/lock.js';

export async function unlockCommand(board: string, cwd?: string): Promise<void> {
  if (!(await boardExists(board, cwd))) {
    console.error(`Board not found: ${board}`);
    process.exitCode = 1;
    return;
  }

  const count = await clearStaleLocks(board, cwd);
  console.log(`Cleared ${count} lock${count === 1 ? '' : 's'} for board: ${board}`);
}
