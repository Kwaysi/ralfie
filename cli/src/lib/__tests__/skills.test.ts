import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installSkills, skillsInstalled, SKILL_FILES } from '../skills.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-skills-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('skills', () => {
  it('installSkills copies all 3 skill files to .claude/skills/', async () => {
    await installSkills(tmp);
    for (const file of SKILL_FILES) {
      const content = await readFile(join(tmp, '.claude', 'skills', file), 'utf-8');
      expect(content).toContain('---');
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it('skill files have correct frontmatter', async () => {
    await installSkills(tmp);
    const plan = await readFile(join(tmp, '.claude', 'skills', 'ralfie-plan.md'), 'utf-8');
    expect(plan).toContain('name: ralfie-plan');
    expect(plan).toContain('description:');

    const edit = await readFile(join(tmp, '.claude', 'skills', 'ralfie-edit.md'), 'utf-8');
    expect(edit).toContain('name: ralfie-edit');

    const run = await readFile(join(tmp, '.claude', 'skills', 'ralfie-run.md'), 'utf-8');
    expect(run).toContain('name: ralfie-run');
  });

  it('ralfie-plan.md contains required phases', async () => {
    await installSkills(tmp);
    const content = await readFile(join(tmp, '.claude', 'skills', 'ralfie-plan.md'), 'utf-8');
    expect(content).toContain('Grilling');
    expect(content).toContain('Plan Generation');
    expect(content).toContain('PRD Generation');
  });

  it('ralfie-edit.md contains required phases', async () => {
    await installSkills(tmp);
    const content = await readFile(join(tmp, '.claude', 'skills', 'ralfie-edit.md'), 'utf-8');
    expect(content).toContain('Setup');
    expect(content).toContain('Grilling');
    expect(content).toContain('Update');
    expect(content).toContain('Drift Log');
  });

  it('ralfie-run.md contains required workflow steps', async () => {
    await installSkills(tmp);
    const content = await readFile(join(tmp, '.claude', 'skills', 'ralfie-run.md'), 'utf-8');
    expect(content).toContain('Pick Task');
    expect(content).toContain('Claim Item');
    expect(content).toContain('Implement');
    expect(content).toContain('Run Feedback Loops');
    expect(content).toContain('Update Progress');
    expect(content).toContain('Update PRD');
    expect(content).toContain('Commit');
    expect(content).toContain('Check Completion');
    expect(content).toContain('Failure Protocol');
  });

  it('skillsInstalled returns false when skills not installed', async () => {
    const result = await skillsInstalled(tmp);
    expect(result).toBe(false);
  });

  it('skillsInstalled returns true after installSkills', async () => {
    await installSkills(tmp);
    const result = await skillsInstalled(tmp);
    expect(result).toBe(true);
  });
});
