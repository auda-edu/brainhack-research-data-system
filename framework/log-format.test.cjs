const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('./log-format.js');

const project = { id: 'lh:proj/2026-demo', slug: 'demo', launched: '2026-09-01', access: 'lab', title: 'Demo project' };
const projects = [project];
const today = '2026-09-27';

test('JSON template is project-specific and imports after required fields are filled', () => {
  const draft = F.jsonTemplate(project, today);
  assert.equal(draft.project, project.id);
  assert.equal(draft.type, 'log');
  draft.author = 'New member';
  draft.summary = 'Checked input files and ran first QC.';
  draft.next_step = 'Review QC with the owner.';
  draft.runs = [{ command: 'python qc.py', inputs: 'raw/v1', outputs: 'qc/report.html', result: 'ok' }];
  const parsed = F.parseFile('daily-log.json', JSON.stringify(draft));
  const { log } = F.validate(parsed, projects, today);
  assert.equal(log.author, 'New member');
  assert.equal(log.runs[0].id, 'lh:run/2026-09-27-demo-1');
});

test('Markdown exported shape imports nested frontmatter and body sections', () => {
  const markdown = `---
id: "lh:log/2026-09-26-demo"
type: "log"
project: "lh:proj/2026-demo"
date: "2026-09-26"
author: "New member"
access: "lab"
runs:
  - id: "lh:run/2026-09-26-demo-1"
    command: "python qc.py"
    inputs: "raw/v1"
    outputs: "qc/report.html"
    result: "ok"
decisions:
  - choice: "Use frozen raw/v1"
    reason: "Reproducible baseline"
issues:
  - problem: "One file missing"
    conditions: "sub-04 session 2"
links:
  - "Lab notes"
review: "proposed"
---

# Lab log 2026-09-26

## Progress

Checked the inputs.

## Next step

Ask the owner about the missing file.

## Blockers

Waiting for access.
`;
  const parsed = F.parseFile('daily-log.md', markdown);
  const { log } = F.validate(parsed, projects, today);
  assert.equal(log.summary, 'Checked the inputs.');
  assert.equal(log.next_step, 'Ask the owner about the missing file.');
  assert.equal(log.runs[0].command, 'python qc.py');
  assert.equal(log.decisions[0].choice, 'Use frozen raw/v1');
  assert.equal(log.issues[0].problem, 'One file missing');
  assert.deepEqual(log.links, ['Lab notes']);
});

test('rejects wrong project, future dates, missing content, and approved claims', () => {
  const base = { type: 'log', project: project.id, date: today, author: 'A', summary: 'Progress', next_step: 'Next' };
  for (const changed of [
    { project: 'lh:proj/2026-other' }, { date: '2026-09-28' },
    { date: '2026-02-30' }, { summary: '' }, { review: 'approved' }
  ]) assert.throws(() => F.validate({ ...base, ...changed }, projects, today));
  assert.throws(() => F.parseFile('backup.json', JSON.stringify({ projects: {}, logs: {} })));
  assert.throws(() => F.parseFile('note.txt', '{}'));
});

test('Markdown template contains planned sections and requires completion', () => {
  const template = F.markdownTemplate(project, today);
  assert.match(template, /## Progress/);
  assert.match(template, /## Next step/);
  assert.match(template, /runs:/);
  assert.throws(() => F.validate(F.parseFile('template.md', template), projects, today));
});

test('new nested IDs do not collide with IDs already present in an imported log', () => {
  const draft = { type: 'log', project: project.id, date: today, author: 'A', summary: 'Progress', next_step: 'Next',
    runs: [{ id: 'lh:run/2026-09-27-demo-1', command: 'first' }, { command: 'second' }] };
  const { log } = F.validate(draft, projects, today);
  assert.equal(log.runs[1].id, 'lh:run/2026-09-27-demo-2');
});
