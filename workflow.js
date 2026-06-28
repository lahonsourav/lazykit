'use strict';

function generateWorkflow({ label, autoTrigger }) {
  const checkList = `            1. Review your changes and make sure no existing functionality is broken.
            2. If you encounter errors you cannot fix, post a comment on the issue explaining what went wrong instead of committing broken code.`;

  const trigger = autoTrigger
    ? `on:
  issues:
    types: [opened]
  issue_comment:
    types: [created]`
    : `on:
  issues:
    types: [opened, labeled]
  issue_comment:
    types: [created]`;

  const condition = autoTrigger
    ? `github.event.action == 'opened' ||
      contains(github.event.comment.body, '@claude')`
    : `contains(github.event.issue.labels.*.name, '${label}') ||
      contains(github.event.comment.body, '@claude')`;

  return `name: LazyKit

${trigger}

concurrency:
  group: lazykit-\${{ github.event.issue.number }}
  cancel-in-progress: false

jobs:
  lazykit:
    if: >
      ${condition}
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
          claude_args: --dangerously-skip-permissions
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
