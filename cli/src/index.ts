#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { listCommand } from './commands/list.js';
import { statusCommand } from './commands/status.js';
import { verifyCommand } from './commands/verify.js';
import { unlockCommand } from './commands/unlock.js';
import { planCommand } from './commands/plan.js';
import { editCommand } from './commands/edit.js';
import { runCommand } from './commands/run.js';
import { serveCommand } from './commands/serve.js';

const program = new Command();

program
  .name('ralf')
  .description('CLI tool for managing agentic coding loops')
  .version('0.0.1');

program
  .command('init')
  .description('Initialize a ralfie project in the current directory')
  .action(async () => {
    await initCommand();
  });

program
  .command('plan')
  .description('Start an interactive planning session to create a new board')
  .action(async () => {
    await planCommand();
  });

program
  .command('edit <board>')
  .description('Edit an existing board interactively')
  .action(async (board: string) => {
    await editCommand(board);
  });

program
  .command('list')
  .description('List all boards with progress')
  .action(async () => {
    await listCommand();
  });

program
  .command('status <board> <status>')
  .description('Show PRD items filtered by status')
  .action(async (board: string, status: string) => {
    await statusCommand(board, status);
  });

program
  .command('verify <board> <item-id>')
  .description('Mark a done item as verified')
  .action(async (board: string, itemId: string) => {
    await verifyCommand(board, itemId);
  });

program
  .command('run <board> [iterations]')
  .description('Run agent loop for a board')
  .action(async (board: string, iterations?: string) => {
    await runCommand(board, iterations ? parseInt(iterations, 10) : undefined);
  });

program
  .command('unlock <board>')
  .description('Clear all lockfiles for a board')
  .action(async (board: string) => {
    await unlockCommand(board);
  });

program
  .command('serve')
  .description('Start the ralfie dashboard server')
  .action(async () => {
    await serveCommand();
  });

program.parse();
