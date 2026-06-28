'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');

const { log } = require('./logger');
const { confirm } = require('./prompt');
const { isGitRepo, getGitRemote, parseGitHubRepo, isGhCliAvailable, isGhAuthenticated } = require('./git');

async function remove() {
  console.log(chalk.bold.white('\n🦥  LazyKit Remove\n'));

  if (!isGitRepo()) {
    log.error('Not inside a git repository.');
    process.exit(1);
  }

  const repoInfo = parseGitHubRepo(getGitRemote());
  if (!repoInfo) {
    log.error('No GitHub remote detected.');
    process.exit(1);
  }

  const confirmed = await confirm('This will remove LazyKit from your repo. Continue?', false);
  if (!confirmed) {
    console.log(chalk.gray('\n  Aborted.\n'));
    process.exit(0);
  }

  const ghReady = isGhCliAvailable() && isGhAuthenticated();
  const deleted = [];

  // Read label name before deleting workflow
  let labelName = 'lazykit';
  const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'lazykit.yml');
  if (fs.existsSync(workflowPath)) {
    const wf = fs.readFileSync(workflowPath, 'utf8');
    const m = wf.match(/label_trigger:\s*(\S+)/);
    if (m) labelName = m[1];
    fs.unlinkSync(workflowPath);
    deleted.push('.github/workflows/lazykit.yml');
    log.success('Removed .github/workflows/lazykit.yml');
  }

  const templatePath = path.join(process.cwd(), '.github', 'ISSUE_TEMPLATE', 'lazykit.md');
  if (fs.existsSync(templatePath)) {
    fs.unlinkSync(templatePath);
    deleted.push('.github/ISSUE_TEMPLATE/lazykit.md');
    log.success('Removed .github/ISSUE_TEMPLATE/lazykit.md');
  }

  const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
  if (fs.existsSync(claudeMdPath)) {
    const removeClaude = await confirm('Remove CLAUDE.md too?', false);
    if (removeClaude) {
      fs.unlinkSync(claudeMdPath);
      deleted.push('CLAUDE.md');
      log.success('Removed CLAUDE.md');
    }
  }

  if (ghReady) {
    const labelSpinner = ora({ text: `Deleting '${labelName}' label from GitHub...`, color: 'cyan' }).start();
    try {
      execSync(`gh label delete "${labelName}" --repo ${repoInfo.owner}/${repoInfo.repo} --yes`, { stdio: 'pipe' });
      labelSpinner.succeed(chalk.green(`Deleted '${labelName}' label from GitHub`));
    } catch {
      labelSpinner.warn(`Could not delete label — remove manually at ${chalk.cyan(`https://github.com/${repoInfo.owner}/${repoInfo.repo}/labels`)}`);
    }

    const secretSpinner = ora({ text: 'Removing CLAUDE_CODE_OAUTH_TOKEN secret...', color: 'cyan' }).start();
    try {
      execSync(`gh secret delete CLAUDE_CODE_OAUTH_TOKEN --repo ${repoInfo.owner}/${repoInfo.repo}`, { stdio: 'pipe' });
      secretSpinner.succeed(chalk.green('Removed CLAUDE_CODE_OAUTH_TOKEN secret'));
    } catch {
      secretSpinner.warn(`Could not remove secret — delete manually in repo Settings → Secrets`);
    }
  } else {
    log.warn(`Remove the '${labelName}' label manually: ${chalk.cyan(`https://github.com/${repoInfo.owner}/${repoInfo.repo}/labels`)}`);
    log.warn(`Remove the CLAUDE_CODE_OAUTH_TOKEN secret manually: ${chalk.cyan(`https://github.com/${repoInfo.owner}/${repoInfo.repo}/settings/secrets/actions`)}`);
  }

  if (deleted.length > 0) {
    const autoPush = await confirm('Commit and push the removals?', true);
    if (autoPush) {
      const spinner = ora({ text: 'Committing and pushing...', color: 'cyan' }).start();
      try {
        execSync(`git add ${deleted.map(f => `"${f}"`).join(' ')}`, { stdio: 'pipe' });
        execSync(`git commit -m "Remove LazyKit automation"`, { stdio: 'pipe' });
        execSync(`git push -u origin HEAD`, { stdio: 'pipe' });
        spinner.succeed(chalk.green('Committed and pushed'));
      } catch {
        spinner.fail('Push failed — commit and push manually');
      }
    }
  }

  console.log(chalk.bold.white('\n  LazyKit has been removed.\n'));
}

module.exports = { remove };
