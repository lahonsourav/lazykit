# 🦥 LazyKit

**Drop an issue, get a PR.**

> 🦥 LazyKit is ready. Go be lazy.

LazyKit wires Claude AI directly into your GitHub repo. Open an issue from your phone, your tablet, or anywhere — Claude reads it, writes the code, and opens a pull request entirely in the cloud. **No laptop. No terminal. No IDE. Nothing running on your machine.**

You describe what you want. Claude ships it.

## Quickstart

```bash
npx @slahon/lazykit@latest init
```

Run this from your **project's root directory** — the same folder that contains your `.git` folder and has a GitHub remote configured. That's it. LazyKit handles everything else automatically.

## Requirements

- Node.js 18+
- A GitHub repository with a remote set up (`git remote -v` should show a GitHub URL)
- A Claude Pro or Max subscription ([claude.ai](https://claude.ai))
- **Claude Code CLI** — `npm install -g @anthropic-ai/claude-code`
- **GitHub CLI (`gh`)** — `brew install gh` or [cli.github.com](https://cli.github.com), then `gh auth login`
- **Claude Code GitHub App** installed on your repo — [github.com/apps/claude](https://github.com/apps/claude) *(required for the Actions workflow to run)*

> **All `npx @slahon/lazykit` commands must be run from your project's root directory** — the folder where your `.git` directory lives and your GitHub remote is configured.

`init` checks for `gh` and `claude` before proceeding. If either is missing or not authenticated, it will show you exactly what to install and wait for you to confirm before continuing — no need to restart.

## How it works

### 1. Open an issue using the LazyKit Task template

Go to your repo on GitHub → **Issues → New issue**. You'll see a **"LazyKit Task"** option — click it to get a pre-filled form. Describe what you want Claude to build, then submit. The `lazykit` label is applied automatically by the template, so you don't need to do anything else.

### 2. GitHub Actions kicks in

The moment the issue is submitted, GitHub detects the `lazykit` label and triggers a workflow run. You can watch it live:

**Go to your repo → Actions tab → "Claude Issue-to-PR" workflow**

You'll see the run appear within seconds. Click into it to follow along in real time — Claude's output (what files it read, what changes it made, its reasoning) streams directly into the Actions log.

### 3. Claude reads, thinks, and writes

Inside the Actions runner, Claude:
- Reads your issue title and description
- Explores your codebase (guided by `CLAUDE.md` if you have one)
- Writes the code changes
- Commits them to a new branch

### 4. A pull request appears

When Claude is done, it opens a pull request against your main branch with a title, description, and a summary of what it did. You'll get a GitHub notification just like a PR from a teammate.

### 5. You review and merge

Look over the diff, request changes in comments if needed (Claude can re-run via `@claude`), then merge when you're happy.

---

You can also mention `@claude` in any issue comment to give follow-up instructions or re-trigger Claude mid-thread.

## What `init` does

Running `npx @slahon/lazykit@latest init` fully sets up your repo — no manual steps required:

| Step | What happens |
|------|-------------|
| Detects repo | Reads your `git remote` to find your GitHub repo |
| Detects stack | Auto-detects your tech stack from `package.json`, `go.mod`, `Cargo.toml`, etc. |
| Creates workflow | `.github/workflows/lazykit.yml` — the GitHub Actions automation |
| Creates issue template | `.github/ISSUE_TEMPLATE/lazykit.md` — auto-applies the trigger label |
| Creates CLAUDE.md | Project guide so Claude understands your codebase |
| Creates label | Creates the trigger label on GitHub |
| Enables PR creation | Grants Actions permission to open pull requests |
| Sets token | Runs `claude setup-token` and stores it as `CLAUDE_CODE_OAUTH_TOKEN` in your repo secrets |
| GitHub App | Prompts you to install the Claude Code GitHub App on your repo |
| Commits and pushes | Commits all generated files and pushes to GitHub |

## Commands

```bash
npx @slahon/lazykit@latest init      # Set up LazyKit in your repo
npx @slahon/lazykit@latest status    # Check if everything is wired up correctly
npx @slahon/lazykit@latest update    # Regenerate workflow and CLAUDE.md
npx @slahon/lazykit@latest remove    # Remove LazyKit from your repo
```

### Flags

```bash
npx @slahon/lazykit@latest init --dry-run      # Preview what would happen without writing files
npx @slahon/lazykit@latest update --dry-run    # Preview changes without applying them
```

### `lazykit status`

Runs a health check and reports:

- Workflow file present
- Issue template present
- CLAUDE.md present
- `CLAUDE_CODE_OAUTH_TOKEN` secret exists (with age warning if over 6 months old)
- Trigger label exists on GitHub
- Actions PR creation permission is enabled
- Branch protection status on `main`

### `lazykit update`

Re-generates `.github/workflows/lazykit.yml` (and optionally `CLAUDE.md`) without re-doing the full setup. Useful when you want to pull in changes to the workflow template. Reads your existing label name and trigger mode from the current workflow file.

### `lazykit remove`

Cleanly removes LazyKit from your repo:
- Deletes the workflow file, issue template, and optionally CLAUDE.md
- Deletes the trigger label from GitHub
- Deletes the `CLAUDE_CODE_OAUTH_TOKEN` secret
- Commits and pushes the removals

## Init options

During `npx @slahon/lazykit@latest init` you will be asked:

| Option | Default | Description |
|--------|---------|-------------|
| Auto-trigger | Yes | Trigger Claude on every new issue, or only when you apply the label |
| Generate CLAUDE.md | Yes | Create a project guide for Claude |

## Trigger modes

**Auto (default)** — Claude fires the moment a new issue is opened. No label needed.

**Label-controlled** — Claude only runs when you apply the trigger label. Use this when you want to review issues before handing them to Claude.

## Authentication

LazyKit uses your Claude Pro/Max subscription via an OAuth token — no pay-per-token API billing.

During `init`, LazyKit runs `claude setup-token` and tries to capture the token automatically. On many systems a browser window opens, you approve access, and the token is stored as `CLAUDE_CODE_OAUTH_TOKEN` in your repo secrets without any extra steps.

If the token can't be captured automatically (varies by system), LazyKit falls back and shows you how to get it:

**Option A — run in a new terminal:**
```bash
claude setup-token
```
If the browser doesn't open, copy the URL it prints and open it manually in your browser.

**Option B — get it directly from Claude.ai:**
1. Go to `https://claude.ai/settings/claude-code`
2. Click **"Generate token"**
3. Copy the token (starts with `sk-ant-oat...`)

Then paste it when LazyKit prompts you — it sets the GitHub secret automatically.

**Token expiry:** OAuth tokens can expire. Run `lazykit status` to check the age of your token. If it's expired, re-run `npx @slahon/lazykit@latest init` to generate and store a fresh one.

## CLAUDE.md

LazyKit creates a `CLAUDE.md` file at your repo root. This is Claude's project guide — it tells Claude about your stack, coding conventions, and rules to follow. Edit it to match your actual project for best results.

## Branch protection

If your `main` branch has protection rules enabled, Claude's pull requests will be opened but **cannot be auto-merged** — they will require manual review and approval. LazyKit detects this during `init` and `status` and warns you.

## Tips

- **Keep issues small and specific.** "Add a `/health` endpoint that returns `{ status: 'ok' }`" works great. "Rewrite the auth system" does not.
- **Edit CLAUDE.md** to describe your folder structure, naming conventions, and any rules Claude must follow.
- **Use `@claude` in comments** to give Claude follow-up instructions or corrections without opening a new issue.
- **Run `lazykit status`** if something stops working — it pinpoints exactly what's misconfigured.
- **Re-run a failed workflow:** Go to your repo → Actions tab → click the failed run → click **"Re-run failed jobs"**. Or just comment `@claude` on the issue to trigger a fresh run.

## License

MIT

---

🦥 **LazyKit is ready. Go be lazy.**
