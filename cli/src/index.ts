#!/usr/bin/env node
import { Command } from 'commander';
import { initCommand } from './commands/init.js';

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

program.parse();
