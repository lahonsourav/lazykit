'use strict';

function generateIssueTemplate({ label }) {
  return `---
name: LazyKit Task
about: Describe a task for Claude to implement
labels: ${label}
---

## What to build

<!-- Describe clearly and specifically what you want Claude to implement. Keep it small and focused. -->

## Acceptance criteria

<!-- Optional: what does "done" look like? -->

## Notes

<!-- Optional: Files to touch, things to avoid, constraints, or extra context for Claude. -->
`;
}

module.exports = { generateIssueTemplate };
