'use strict';

function generateWorkflow({ label, lintCommand, testCommand }) {
  const hasLint = lintCommand && lintCommand !== 'skip';
  const hasTest = testCommand && testCommand !== 'skip';

  const checks = [
    hasLint ? `Run \`${lintCommand}\` and fix any issues before committing.` : null,
    hasTest ? `Run \`${testCommand}\` and make sure all tests pass before committing.` : null,
    'If lint or tests fail and you cannot fix them, do NOT commit — instead post a comment on the issue explaining what went wrong.',
  ].filter(Boolean);

  const checkList = checks.map((c, i) => `            ${i + 1}. ${c}`).join('\n');

  return `name: LazyKit

on:
  issues:
    types: [opened, labeled]
  issue_comment:
    types: [created]

concurrency:
  group: lazykit-\${{ github.event.issue.number }}
  cancel-in-progress: false

jobs:
  lazykit:
    if: >
      contains(github.event.issue.labels.*.name, '${label}') ||
      contains(github.event.comment.body, '@claude')
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: write
      pull-requests: write
      issues: write
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: anthropics/claude-code-action@v1
        with:
          claude_code_oauth_token: \${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
          label_trigger: ${label}
          claude_args: --max-turns 50 --dangerously-skip-permissions
          prompt: |
            You are an autonomous coding agent called LazyKit.
            Your job is to read the GitHub issue, understand the requirement,
            implement the changes in the codebase, and open a pull request.

            Before opening the PR:
${checkList}

            When opening the PR:
            - Use a clear title that summarises what was done
            - Write a description explaining what changed and why
            - Reference the issue number so it auto-closes on merge
`;
}

module.exports = { generateWorkflow };
