'use strict';

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');

const { log } = require('./logger');
const { ask, confirm } = require('./prompt');
const { isGitRepo, getGitRemote, parseGitHubRepo, isGhCliAvailable, isGhAuthenticated, isClaudeAvailable, detectStack, hasBranchProtection } = require('./git');
const { generateWorkflow } = require('./workflow');
const { generateClaudeMd } = require('./claude-md');
const { generateIssueTemplate } = require('./issue-template');

async function init({ dryRun = false } = {}) {
  if (dryRun) console.log(chalk.yellow('\n  [dry-run] Preview mode — no files will be written or API calls made.\n'));

  console.log(chalk.bold.white('\n🦥  LazyKit — Drop an issue, get a PR.\n'));
  console.log(chalk.gray('  This will set up AI-powered issue-to-PR automation in your repo.\n'));

  // ─── Step 1: Verify git repo ──────────────────────────────────────────────
  if (!isGitRepo()) {
    log.error('Not inside a git repository.');
    console.log(chalk.gray('\n  LazyKit needs a git repo with a GitHub remote. To set one up:\n'));
    console.log(chalk.cyan('    git init'));
    console.log(chalk.cyan('    git remote add origin https://github.com/<you>/<repo>'));
    console.log(chalk.gray('\n  Then re-run: ') + chalk.cyan('npx @slahon/lazykit@latest init\n'));
    process.exit(1);
  }

  const remote = getGitRemote();
  const repoInfo = parseGitHubRepo(remote);
  const stack = detectStack();

  if (repoInfo) {
    log.success(`Detected repo: ${chalk.cyan(`${repoInfo.owner}/${repoInfo.repo}`)}`);
    if (stack) log.success(`Detected stack: ${chalk.cyan(stack)}`);
  } else {
    log.error('No GitHub remote detected.');
    console.log(chalk.gray('\n  LazyKit requires a GitHub repository with a remote set up.\n'));
    console.log(chalk.gray('  To fix this, connect your repo to GitHub first:\n'));
    console.log(chalk.cyan('    git remote add origin https://github.com/<you>/<repo>'));
    console.log(chalk.gray('\n  Then re-run: ') + chalk.cyan('npx @slahon/lazykit@latest init\n'));
    process.exit(1);
  }

  // ─── Step 2: Check dependencies (mandatory) ──────────────────────────────

  // gh CLI
  while (!isGhCliAvailable()) {
    log.error('GitHub CLI (gh) is required but not found.');
    console.log(chalk.gray('\n  LazyKit uses gh to create labels, set secrets, and enable PR permissions.\n'));
    console.log(chalk.gray('  Install it from: ') + chalk.cyan('https://cli.github.com'));
    console.log(chalk.gray('  macOS:           ') + chalk.cyan('brew install gh'));
    console.log(chalk.gray('  Windows:         ') + chalk.cyan('winget install --id GitHub.cli\n'));
    await confirm('Press Enter once gh is installed to check again', true);
  }
  log.success('GitHub CLI (gh) found');

  // gh auth
  while (!isGhAuthenticated()) {
    log.error('GitHub CLI is not authenticated.');
    console.log(chalk.gray('\n  Run this in your terminal, then come back:\n'));
    console.log(chalk.cyan('    gh auth login\n'));
    await confirm('Press Enter once you are logged in to check again', true);
  }
  log.success('GitHub CLI authenticated');

  // Claude Code CLI
  while (!isClaudeAvailable()) {
    log.error('Claude Code CLI is required but not found.');
    console.log(chalk.gray('\n  Install it with:\n'));
    console.log(chalk.cyan('    npm install -g @anthropic-ai/claude-code\n'));
    await confirm('Press Enter once Claude Code is installed to check again', true);
  }
  log.success('Claude Code CLI found');

  const ghReady = true;

  log.blank();

  // ─── Step 3: Ask questions ────────────────────────────────────────────────
  log.title('Configure LazyKit');
  log.blank();

  const label = 'lazykit';
  const autoTrigger = await confirm('Trigger Claude on every new issue automatically? (no = only when you apply the label)', true);
  const wantClaudeMd = await confirm('Generate CLAUDE.md project guide?', true);

  log.blank();

  // ─── Step 4: Create workflow file ─────────────────────────────────────────
  const workflowDir = path.join(process.cwd(), '.github', 'workflows');
  const workflowPath = path.join(workflowDir, 'lazykit.yml');

  if (dryRun) {
    log.info('[dry-run] Would create: .github/workflows/lazykit.yml');
  } else {
    const spinner = ora({ text: 'Creating workflow file...', color: 'cyan' }).start();
    fs.mkdirSync(workflowDir, { recursive: true });
    fs.writeFileSync(workflowPath, generateWorkflow({ label, autoTrigger }));
    spinner.succeed(chalk.green('Created .github/workflows/lazykit.yml'));
  }

  // ─── Step 5: Create issue template ───────────────────────────────────────
  const templateDir = path.join(process.cwd(), '.github', 'ISSUE_TEMPLATE');
  const templatePath = path.join(templateDir, 'lazykit.md');

  if (dryRun) {
    log.info('[dry-run] Would create: .github/ISSUE_TEMPLATE/lazykit.md');
  } else {
    const spinner = ora({ text: 'Creating issue template...', color: 'cyan' }).start();
    fs.mkdirSync(templateDir, { recursive: true });
    fs.writeFileSync(templatePath, generateIssueTemplate({ label }));
    spinner.succeed(chalk.green('Created .github/ISSUE_TEMPLATE/lazykit.md'));
  }

  // ─── Step 6: Create CLAUDE.md ─────────────────────────────────────────────
  if (wantClaudeMd) {
    const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');

    if (dryRun) {
      log.info('[dry-run] Would create: CLAUDE.md');
    } else if (fs.existsSync(claudeMdPath)) {
      const overwrite = await confirm('CLAUDE.md already exists. Overwrite?', false);
      if (overwrite) {
        fs.writeFileSync(claudeMdPath, generateClaudeMd({ stack }));
        log.success('Updated CLAUDE.md');
      } else {
        log.warn('Skipped CLAUDE.md — keeping existing file.');
      }
    } else {
      fs.writeFileSync(claudeMdPath, generateClaudeMd({ stack }));
      log.success('Created CLAUDE.md');
    }
  }

  // ─── Step 7: Create GitHub label ──────────────────────────────────────────
  if (dryRun) {
    log.info(`[dry-run] Would create GitHub label: '${label}'`);
  } else if (ghReady) {
    const labelSpinner = ora({ text: `Creating '${label}' label on GitHub...`, color: 'cyan' }).start();
    try {
      execSync(
        `gh label create "${label}" --color "#7B61FF" --description "Let Claude handle this" --repo ${repoInfo.owner}/${repoInfo.repo}`,
        { stdio: 'pipe' }
      );
      labelSpinner.succeed(chalk.green(`Created '${label}' label on GitHub`));
    } catch (err) {
      const msg = err.stderr?.toString() || '';
      if (msg.includes('already exists')) {
        labelSpinner.succeed(chalk.green(`Label '${label}' already exists — skipping`));
      } else {
        labelSpinner.warn(chalk.yellow(`Could not create label — create it manually at https://github.com/${repoInfo.owner}/${repoInfo.repo}/labels`));
      }
    }
  } else {
    log.warn(`Create the '${label}' label manually at: ${chalk.cyan(`https://github.com/${repoInfo.owner}/${repoInfo.repo}/labels`)}`);
  }

  // ─── Step 8: Enable Actions PR creation ───────────────────────────────────
  if (dryRun) {
    log.info('[dry-run] Would enable Actions PR creation permission');
  } else if (ghReady) {
    const prSpinner = ora({ text: 'Enabling Actions PR creation permission...', color: 'cyan' }).start();
    try {
      execSync(
        `gh api repos/${repoInfo.owner}/${repoInfo.repo}/actions/permissions/workflow --method PUT --field default_workflow_permissions=write --field can_approve_pull_request_reviews=true`,
        { stdio: 'pipe' }
      );
      prSpinner.succeed(chalk.green('Enabled: Actions can create and approve pull requests'));
    } catch (err) {
      const msg = err.stderr?.toString() || '';
      if (msg.includes('403') || msg.includes('Must have admin rights')) {
        prSpinner.warn(chalk.yellow('Permission denied — you need repo admin rights to change this setting.'));
        console.log(chalk.gray(`\n  Enable it manually: ${chalk.cyan(`https://github.com/${repoInfo.owner}/${repoInfo.repo}/settings/actions`)}`));
        console.log(chalk.gray('  Actions → General → Workflow permissions → Enable "Allow GitHub Actions to create and approve pull requests"\n'));
      } else {
        prSpinner.warn(chalk.yellow('Could not enable PR creation automatically.'));
        console.log(chalk.gray(`  Enable manually: ${chalk.cyan(`https://github.com/${repoInfo.owner}/${repoInfo.repo}/settings/actions`)}\n`));
      }
    }
  }

  // ─── Step 9: Branch protection warning ────────────────────────────────────
  if (!dryRun && ghReady && hasBranchProtection(repoInfo)) {
    log.warn('Branch protection is enabled on main.');
    console.log(chalk.gray("  Claude's PRs will be opened but cannot be auto-merged — they require manual review.\n"));
  }

  // ─── Step 10: Generate and set Claude token ────────────────────────────────
  if (dryRun) {
    log.info('[dry-run] Would run claude setup-token and set CLAUDE_CODE_OAUTH_TOKEN secret');
  } else {
    console.log('\n' + chalk.bold.green('  ✨ Almost there — setting up your Claude token...\n'));

    try {
      log.info('Running claude setup-token (a browser window may open to authenticate)...');
      console.log();

      const result = spawnSync('claude', ['setup-token'], {
        stdio: ['inherit', 'pipe', 'pipe'],
        encoding: 'utf8',
      });

      if (result.stderr) process.stderr.write(result.stderr);

      const output = (result.stdout || '') + (result.stderr || '');
      let token = (output.match(/sk-ant-oat[^\s]+/) || [])[0];

      // Fallback: ask user to paste if auto-capture didn't work
      if (!token) {
        console.log();
        log.warn('Could not capture the token automatically.');
        console.log(chalk.gray('\n  If no browser opened, here\'s how to get your token manually:\n'));
        console.log(chalk.bold('  Option A — run in a new terminal window:'));
        console.log(chalk.cyan('    claude setup-token'));
        console.log(chalk.gray('    If the browser still doesn\'t open, copy the URL it prints and open it manually.\n'));
        console.log(chalk.bold('  Option B — get it directly from Claude.ai:'));
        console.log(chalk.gray('    1. Go to: ') + chalk.cyan('https://claude.ai/settings/claude-code'));
        console.log(chalk.gray('    2. Click "Generate token"'));
        console.log(chalk.gray('    3. Copy the token (starts with sk-ant-oat...)\n'));
        const pasted = await ask('Paste your token here (or press Enter to skip)', '');
        if (pasted && pasted.trim().startsWith('sk-ant-oat')) {
          token = pasted.trim();
        }
      }

      if (token && ghReady) {
        const secretSpinner = ora({ text: 'Adding CLAUDE_CODE_OAUTH_TOKEN to GitHub secrets...', color: 'cyan' }).start();
        execSync(
          `gh secret set CLAUDE_CODE_OAUTH_TOKEN --body "${token}" --repo ${repoInfo.owner}/${repoInfo.repo}`,
          { stdio: 'pipe' }
        );
        secretSpinner.succeed(chalk.green('CLAUDE_CODE_OAUTH_TOKEN added to GitHub secrets'));
      } else if (token && !ghReady) {
        log.warn('gh CLI not available — add the secret manually:');
        console.log(chalk.gray('    Go to:      ') + chalk.cyan(`https://github.com/${repoInfo.owner}/${repoInfo.repo}/settings/secrets/actions`));
        console.log(chalk.gray('    Add secret: ') + chalk.cyan('CLAUDE_CODE_OAUTH_TOKEN') + chalk.gray(' = ') + chalk.cyan(token));
      } else {
        throw new Error('No token');
      }
    } catch (err) {
      const isNotFound = (err.message || '').includes('ENOENT');
      if (isNotFound) {
        log.warn('Claude Code CLI not found — install it first:');
        console.log(chalk.cyan('\n    npm install -g @anthropic-ai/claude-code'));
      } else {
        log.warn('Token not set — add it manually:');
      }
      console.log(chalk.gray('\n    1. Run:        ') + chalk.cyan('claude setup-token'));
      console.log(chalk.gray('    2. Go to:      ') + chalk.cyan(`https://github.com/${repoInfo.owner}/${repoInfo.repo}/settings/secrets/actions`));
      console.log(chalk.gray('    3. Add secret: ') + chalk.cyan('CLAUDE_CODE_OAUTH_TOKEN') + chalk.gray(' = the token you copied\n'));
    }
  }

  // ─── Step 11: Install Claude Code GitHub App ──────────────────────────────
  if (!dryRun) {
    console.log('\n' + chalk.bold.white('  📦 Install the Claude Code GitHub App\n'));
    console.log(chalk.gray('  The workflow requires the Claude Code GitHub App installed on your repo.'));
    console.log(chalk.gray('  Without it, the Actions run will fail with a 401 error.\n'));
    console.log('  ' + chalk.bold.cyan('→ https://github.com/apps/claude') + '\n');
    console.log(chalk.gray('  Click "Install" → select your account → grant access to this repo.'));
    console.log(chalk.gray('  Takes about 30 seconds.\n'));
    await confirm('Installed the GitHub App? (press Enter to continue)', true);
  } else {
    log.info('[dry-run] Would prompt: install Claude Code GitHub App at https://github.com/apps/claude');
  }

  log.divider();

  // ─── Step 12: Commit and push ──────────────────────────────────────────────
  if (dryRun) {
    log.info('[dry-run] Would commit and push generated files');
    log.blank();
  } else {
    const autoPush = await confirm('Commit and push the generated files now?', true);

    if (autoPush) {
      const pushSpinner = ora({ text: 'Committing and pushing...', color: 'cyan' }).start();
      try {
        const files = [
          '.github/workflows/lazykit.yml',
          '.github/ISSUE_TEMPLATE/lazykit.md',
          ...(wantClaudeMd ? ['CLAUDE.md'] : []),
        ].join(' ');
        execSync(`git add ${files}`, { stdio: 'pipe' });
        execSync(`git commit -m "Add LazyKit automation"`, { stdio: 'pipe' });
        execSync(`git push -u origin HEAD`, { stdio: 'pipe' });
        pushSpinner.succeed(chalk.green('Committed and pushed — workflow is live'));
      } catch {
        pushSpinner.fail(chalk.red('Push failed.'));
        console.log(chalk.gray('\n  Push it manually:\n'));
        console.log(chalk.cyan(`    git add .github/workflows/lazykit.yml .github/ISSUE_TEMPLATE/lazykit.md${wantClaudeMd ? ' CLAUDE.md' : ''}`));
        console.log(chalk.cyan('    git commit -m "Add LazyKit automation"'));
        console.log(chalk.cyan('    git push\n'));
      }
    } else {
      console.log(chalk.bold('\n  Push the files yourself when ready:\n'));
      console.log(chalk.cyan(`    git add .github/workflows/lazykit.yml .github/ISSUE_TEMPLATE/lazykit.md${wantClaudeMd ? ' CLAUDE.md' : ''}`));
      console.log(chalk.cyan('    git commit -m "Add LazyKit automation"'));
      console.log(chalk.cyan('    git push'));
    }
  }

  log.divider();

  console.log(chalk.bold('\n  Done! Here is how to use it:\n'));
  console.log(`  ${chalk.gray('1.')} Open a GitHub issue using the ${chalk.bold.magenta('LazyKit Task')} template`);
  if (autoTrigger) {
    console.log(`  ${chalk.gray('2.')} Claude starts working on it automatically`);
  } else {
    console.log(`  ${chalk.gray('2.')} Apply the ${chalk.bold.magenta(label)} label to trigger Claude`);
  }
  console.log(`  ${chalk.gray('3.')} Review and merge the pull request`);
  console.log(`\n  ${chalk.gray('Tip:')} Mention ${chalk.bold.cyan('@claude')} in any issue comment to give follow-up instructions.\n`);

  console.log(chalk.bold.white('  🦥  LazyKit is ready. Go be lazy.\n'));
}

module.exports = { init };
