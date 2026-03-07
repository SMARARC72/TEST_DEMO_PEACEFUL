#!/usr/bin/env node
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

const bannedPatterns = [
  { name: 'Secrets Manager ARN', regex: /arn:aws:secretsmanager:/gi },
  { name: 'taskDefinitionArn field', regex: /"taskDefinitionArn"\s*:/gi },
  { name: 'ECR registry host', regex: /dkr\.ecr\./gi },
  { name: 'IAM principal/account ARN', regex: /arn:aws:iam::/gi }
];

const approvedTemplateRegexes = [
  /\.example\.json$/i
];

const files = execSync("git ls-files '*.json'", { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean);

const violations = [];

for (const filePath of files) {
  if (!existsSync(filePath)) {
    continue;
  }

  if (approvedTemplateRegexes.some((regex) => regex.test(filePath))) {
    continue;
  }

  const contents = readFileSync(filePath, 'utf8');
  for (const pattern of bannedPatterns) {
    if (pattern.regex.test(contents)) {
      violations.push({ filePath, pattern: pattern.name });
    }
    pattern.regex.lastIndex = 0;
  }
}

if (violations.length > 0) {
  console.error('Sensitive infrastructure metadata detected in non-template JSON files:\n');
  for (const violation of violations) {
    console.error(`- ${violation.filePath}: ${violation.pattern}`);
  }
  console.error('\nMove raw data to untracked local files and commit only sanitized *.example.json templates.');
  process.exit(1);
}

console.log('No sensitive JSON patterns found outside approved templates.');
