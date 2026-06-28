'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');

const { log } = require('./logger');
const { isGitRepo, getGitRemote, parseGitHubRepo, isGhCliAvailable, isGhAuthenticated } = require('./git');

async function status() {
  console.log(chalk.bold.white('\n🦥  LazyKit Status\n'));

  if (!isGitRepo()) {
    log.error('Not inside a git repository.');
    return;
  }

  const repoInfo = parseGitHubRepo(getGitRemote());
  if (!repoInfo) {
    log.error('No GitHub remote detected.');
    return;
  }

  log.info(`Repo: ${chalk.cyan(`${repoInfo.owner}/${repoInfo.repo}`)}`);
  log.blank();

  // Local files
  const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'lazykit.yml');
  const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
  const templatePath = path.join(process.cwd(), '.github', 'ISSUE_TEMPLATE', 'lazykit.md');

  fs.existsSync(workflowPath)
    ? log.success('Workflow file found')
    : log.error('Workflow file missing — run npx @slahon/lazykit@latest init');

  fs.existsSync(templatePath)
    ? log.success('Issue template found')
    : log.warn('Issue template missing — run npx @slahon/lazykit@latest init');

  fs.existsSync(claudeMdPath)
    ? log.success('CLAUDE.md found')
    : log.warn('CLAUDE.md not found — Claude has no project context');

  // Remote checks require gh
  const ghReady = isGhCliAvailable() && isGhAuthenticated();
  if (!ghReady) {
    log.blank();
    log.warn('gh CLI not available or not authenticated — skipping remote checks');
    log.warn('Run: ' + chalk.cyan('gh auth login'));
    console.log();
    return;
  }

  log.blank();

  // Secret
  try {
    const secrets = execSync(`gh secret list --repo ${repoInfo.owner}/${repoInfo.repo}`, { stdio: 'pipe' }).toString();
    const match = secrets.match(/CLAUDE_CODE_OAUTH_TOKEN\s+(\S+)/);
    if (match) {
      const updated = new Date(match[1]);
      const monthsOld = (Date.now() - updated.getTime()) / (1000 * 60 * 60 * 24 * 30);
      log.success(`CLAUDE_CODE_OAUTH_TOKEN secret exists ${chalk.gray(`(updated ${match[1]})`)}`);
      if (monthsOld > 6) log.warn('Token is over 6 months old — consider refreshing it with npx @slahon/lazykit@latest init');
    } else {
      log.error('CLAUDE_CODE_OAUTH_TOKEN secret not found — run npx @slahon/lazykit@latest init');
    }
  } catch {
    log.warn('Could not check secrets — insufficient permissions');
  }

  // Label
  try {
    let labelName = 'lazykit';
    if (fs.existsSync(workflowPath)) {
      const wf = fs.readFileSync(workflowPath, 'utf8');
      const m = wf.match(/label_trigger:\s*(\S+)/);
      if (m) labelName = m[1];
    }
    const labels = execSync(`gh label list --repo ${repoInfo.owner}/${repoInfo.repo}`, { stdio: 'pipe' }).toString();
    labels.includes(labelName)
      ? log.success(`Label '${labelName}' exists on GitHub`)
      : log.error(`Label '${labelName}' not found — run npx @slahon/lazykit@latest init`);
  } catch {
    log.warn('Could not check labels');
  }

  // PR creation permission
  try {
    const perms = JSON.parse(execSync(
      `gh api repos/${repoInfo.owner}/${repoInfo.repo}/actions/permissions/workflow`,
      { stdio: 'pipe' }
    ).toString());
    perms.can_approve_pull_request_reviews
      ? log.success('Actions can create and approve pull requests')
      : log.warn(`PR creation not enabled — ${chalk.cyan(`https://github.com/${repoInfo.owner}/${repoInfo.repo}/settings/actions`)}`);
  } catch {
    log.warn('Could not check Actions permissions');
  }

  // Branch protection
  try {
    execSync(`gh api repos/${repoInfo.owner}/${repoInfo.repo}/branches/main/protection`, { stdio: 'pipe' });
    log.warn("Branch protection is on — Claude's PRs require manual review before merge");
  } catch {
    log.success("No branch protection on main — Claude's PRs can be merged directly");
  }

  log.blank();
  log.info(`Claude Code GitHub App: verify it's installed at ${chalk.cyan(`https://github.com/apps/claude`)}`);
  log.info('  If the Actions run fails with a 401 error, the app is not installed.');

  console.log();
}

module.exports = { status };
