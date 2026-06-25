# 🦥 LazyKit

**Drop an issue, get a PR.**

LazyKit wires Claude AI into your GitHub repo so that when you label an issue, Claude reads it, writes the code, and opens a pull request — while you do something else.

## Quickstart

```bash
npx lazykit init
```

Run this inside your project folder. It will:
- Create `.github/workflows/lazykit.yml`
- Create `CLAUDE.md` with project context for Claude
- Create the trigger label on GitHub
- Print the one manual step (adding your Claude token)

## Requirements

- Node.js 18+
- A GitHub repository
- A Claude Pro or Max subscription ([claude.ai](https://claude.ai))
- Claude Code installed locally (`npm install -g @anthropic-ai/claude-code`)
- GitHub CLI (`gh`) — optional but recommended

## How it works

1. You open a GitHub issue describing what you want
2. You apply the `lazykit` label (or whatever you named it)
3. A GitHub Actions workflow fires and runs Claude Code
4. Claude reads the issue, explores your codebase, writes the changes
5. Claude opens a pull request with a title and description
6. You review and merge

## Authentication

LazyKit uses your Claude Pro/Max subscription via an OAuth token — no pay-per-token API billing.

After running `npx lazykit init`, you need to:

1. Generate your token:
   ```bash
   claude setup-token
   ```

2. Add it to your repo as a secret named `CLAUDE_CODE_OAUTH_TOKEN`

## CLAUDE.md

LazyKit creates a `CLAUDE.md` file at your repo root. This is Claude's project guide — it tells Claude about your stack, conventions, and what commands to run before opening a PR. Edit it to match your actual project.

## Options

During `npx lazykit init` you will be asked:

| Option | Default | Description |
|--------|---------|-------------|
| Label name | `lazykit` | The GitHub label that triggers Claude |
| Stack | — | Your tech stack (goes into CLAUDE.md) |
| Lint command | `npm run lint` | Run before every PR |
| Test command | `npm test` | Run before every PR |

## Tips

- **Keep issues small and specific.** "Add a /health endpoint that returns `{ status: 'ok' }`" works great. "Rewrite the auth system" does not.
- **Edit CLAUDE.md** to describe your folder structure, naming conventions, and any rules Claude must follow.
- The `lazykit` label is your control switch — Claude only runs when you apply it, so you stay in charge.

## License

MIT
