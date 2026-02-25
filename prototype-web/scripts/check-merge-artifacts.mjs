import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const candidates = [
  'index.html',
  'src/main.tsx',
  'src/App.tsx'
];

const conflictPattern = /(<<<<<<<\s|=======\s*$|>>>>>>>\s)/m;
const knownLeakPattern = /(codex\/test-remote-connection-to-repo\s*={2,}>+\s*main|<{3,}\s*codex\/test-remote-connection-to-repo|={6,}\s*>{6,}\s*main)/i;

const issues = [];

for (const relative of candidates) {
  const fullPath = resolve(process.cwd(), relative);
  if (!existsSync(fullPath)) continue;
  const content = readFileSync(fullPath, 'utf8');

  if (conflictPattern.test(content)) {
    issues.push(`${relative}: unresolved git merge conflict marker found`);
  }
  if (knownLeakPattern.test(content)) {
    issues.push(`${relative}: leaked branch marker text found`);
  }
}

if (issues.length > 0) {
  console.error('\nMerge artifact guard failed:\n');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  console.error('\nResolve artifacts before building/deploying.');
  process.exit(1);
}

console.log('Merge artifact guard passed.');
