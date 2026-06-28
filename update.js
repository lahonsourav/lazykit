'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');

const { log } = require('./logger');
const { confirm } = require('./prompt');
const { isGitRepo, getGitRemote, parseGitHubRepo, detectStack } = require('./git');
const { generateWorkflow } = require('./workflow');
const { generateClaudeMd } = require('./claude-md');

async function update({ dryRun = false } = {}) {
  if (dryRun) console.log(chalk.yellow('\n  [dry-run] Preview mode — no files will be written.\n'));
  console.log(chalk.bold.white('\n🦥  LazyKit Update\n'));

  if (!isGitRepo()) {
    log.error('Not inside a git repository.');
    process.exit(1);
  }

  const repoInfo = parseGitHubRepo(getGitRemote());
  if (!repoInfo) {
    log.error('No GitHub remote detected.');
    process.exit(1);
  }

  const workflowPath = path.join(process.cwd(), '.github', 'workflows', 'lazykit.yml');
  const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');

  // Read existing config from workflow file
  let label = 'lazykit';
  let autoTrigger = true;
  if (fs.existsSync(workflowPath)) {
    const wf = fs.readFileSync(workflowPath, 'utf8');
    const m = wf.match(/label_trigger:\s*(\S+)/);
    if (m) label = m[1];
    autoTrigger = wf.includes("github.event.action == 'opened'");
  }

  const stack = detectStack();
  const filesToPush = [];

  // Regenerate workflow
  if (dryRun) {
    log.info('[dry-run] Would update: .github/workflows/lazykit.yml');
  } else {
    const spinner = ora({ text: 'Updating workflow file...', color: 'cyan' }).start();
    fs.mkdirSync(path.dirname(workflowPath), { recursive: true });
    fs.writeFileSync(workflowPath, generateWorkflow({ label, autoTrigger }));
    spinner.succeed(chalk.green('Updated .github/workflows/lazykit.yml'));
    filesToPush.push('.github/workflows/lazykit.yml');
  }

  // Regenerate CLAUDE.md if it exists
  if (fs.existsSync(claudeMdPath)) {
    const regen = await confirm('Regenerate CLAUDE.md?', true);
    if (regen) {
      if (dryRun) {
        log.info('[dry-run] Would update: CLAUDE.md');
      } else {
        fs.writeFileSync(claudeMdPath, generateClaudeMd({ stack }));
        log.success('Updated CLAUDE.md');
        filesToPush.push('CLAUDE.md');
      }
    }
  }

  if (!dryRun && filesToPush.length > 0) {
    const autoPush = await confirm('Commit and push?', true);
    if (autoPush) {
      const spinner = ora({ text: 'Committing and pushing...', color: 'cyan' }).start();
      try {
        execSync(`git add ${filesToPush.join(' ')}`, { stdio: 'pipe' });
        execSync(`git commit -m "Update LazyKit configuration"`, { stdio: 'pipe' });
        execSync(`git push -u origin HEAD`, { stdio: 'pipe' });
        spinner.succeed(chalk.green('Committed and pushed'));
      } catch {
        spinner.fail('Push failed — commit and push manually');
      }
    }
  }

  console.log();
}

module.exports = { update };
