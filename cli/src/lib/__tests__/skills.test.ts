import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installSkills, skillsInstalled, SKILL_NAMES } from '../skills.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'ralfie-skills-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('skills', () => {
  it('installSkills copies all 4 skills to .claude/skills/<name>/SKILL.md', async () => {
    await installSkills(tmp);
    for (const name of SKILL_NAMES) {
      const content = await readFile(join(tmp, '.claude', 'skills', name, 'SKILL.md'), 'utf-8');
      expect(content).toContain('---');
      expect(content.length).toBeGreaterThan(0);
    }
  });

  it('skill files have correct frontmatter', async () => {
    await installSkills(tmp);
    const plan = await readFile(join(tmp, '.claude', 'skills', 'ralf-plan', 'SKILL.md'), 'utf-8');
    expect(plan).toContain('name: ralf-plan');
    expect(plan).toContain('description:');

    const edit = await readFile(join(tmp, '.claude', 'skills', 'ralf-edit', 'SKILL.md'), 'utf-8');
    expect(edit).toContain('name: ralf-edit');

    const run = await readFile(join(tmp, '.claude', 'skills', 'ralf-run', 'SKILL.md'), 'utf-8');
    expect(run).toContain('name: ralf-run');
  });

  it('ralf-plan contains required phases', async () => {
    await installSkills(tmp);
    const content = await readFile(join(tmp, '.claude', 'skills', 'ralf-plan', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Grilling');
    expect(content).toContain('Plan Generation');
    expect(content).toContain('PRD Generation');
  });

  it('ralf-edit contains required phases', async () => {
    await installSkills(tmp);
    const content = await readFile(join(tmp, '.claude', 'skills', 'ralf-edit', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Setup');
    expect(content).toContain('Grilling');
    expect(content).toContain('Update');
    expect(content).toContain('Drift Log');
  });

  it('ralf-run contains required workflow steps (implement only)', async () => {
    await installSkills(tmp);
    const content = await readFile(join(tmp, '.claude', 'skills', 'ralf-run', 'SKILL.md'), 'utf-8');
    expect(content).toContain('Pick Task');
    expect(content).toContain('Claim Item');
    expect(content).toContain('Implement');
    expect(content).toContain('Run Feedback Loops');
    expect(content).toContain('Failure Protocol');
    // ralf-run should NOT contain finalization steps
    expect(content).not.toContain('## Step 5:');
    expect(content).not.toContain('Commit');
  });

  it('ralf-finalize contains required finalization steps', async () => {
    await installSkills(tmp);
    const content = await readFile(join(tmp, '.claude', 'skills', 'ralf-finalize', 'SKILL.md'), 'utf-8');
    expect(content).toContain('name: ralf-finalize');
    expect(content).toContain('Update Progress');
    expect(content).toContain('Update PRD');
    expect(content).toContain('Commit');
    expect(content).toContain('Check Completion');
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
