/**
 * Move registry items to a status (plan §3).
 *   node scripts/python-v2/set-status.mjs <status> <id> [id ...]
 * Statuses only move forward one evidence step at a time; `published` is set by a reviewer, never by a script run in CI.
 */
import fs from 'node:fs';
const FILE = 'src/content/python-v2/registry.json';
const ORDER = ['planned', 'drafted', 'tests-pass', 'reviewed', 'published'];
const [status, ...ids] = process.argv.slice(2);
if (!ORDER.includes(status) || !ids.length) throw new Error('Usage: set-status.mjs <status> <id> [id ...]');
const reg = JSON.parse(fs.readFileSync(FILE, 'utf8'));
const all = [...reg.lessons, ...reg.questions, ...reg.tools, ...reg.projects, ...reg.projects.flatMap(p => p.milestones)];
for (const id of ids) {
  const e = all.find(x => x.id === id);
  if (!e) throw new Error(`unknown id ${id}`);
  e.status = status;
}
fs.writeFileSync(FILE, JSON.stringify(reg, null, 1) + '\n');
console.log(`${ids.length} → ${status}`);
