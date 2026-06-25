'use strict';

function generateClaudeMd({ stack, lintCommand, testCommand }) {
  const hasLint = lintCommand && lintCommand !== 'skip';
  const hasTest = testCommand && testCommand !== 'skip';

  return `# LazyKit — Project Guide for Claude

## Stack
${stack || 'Describe your tech stack here (e.g. TypeScript + Next.js, Postgres via Prisma)'}

## Conventions
- Match the existing code style and patterns in whatever file you are editing.
- Follow the folder structure already present in the repo.
- Keep changes scoped to what the issue asks for — do not refactor unrelated code.

## Before opening a PR, always:
${hasLint ? `1. Run \`${lintCommand}\` and fix all errors and warnings.` : '1. Check your code for obvious errors.'}
${hasTest ? `2. Run \`${testCommand}\` and make sure all tests pass.` : '2. Make sure existing functionality is not broken.'}
3. If you cannot get lint/tests passing, comment on the issue explaining why instead of pushing broken code.

## Never
- Touch \`.github/workflows/\`, secrets, or CI configuration.
- Add new dependencies without clearly noting them in the PR description.
- Make changes outside the scope of the issue.
- Merge your own pull requests.
`;
}

module.exports = { generateClaudeMd };
