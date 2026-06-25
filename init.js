'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const ora = require('ora');

const { log } = require('../utils/logger');
const { ask, confirm, select } = require('../utils/prompt');
const { isGitRepo, getGitRemote, parseGitHubRepo, isGhCliAvailable } = require('../utils/git');
const { generateWorkflow } = require('../templates/workflow');
const { generateClaudeMd } = require('../templates/claude-md');

async function init() {
  console.log(chalk.bold.white('\n🦥  LazyKit — Drop an issue, get a PR.\n'));
  console.log(chalk.gray('  This will set up AI-powered issue-to-PR automation in your repo.\n'));

  // ─── Step 1: Verify git repo ─────────────────────────────────────────────
  if (!isGitRepo()) {
    log.error('Not inside a git repository. Run this from your project root.');
    process.exit(1);
  }

  const remote = getGitRemote();
  const repoInfo = parseGitHubRepo(remote);

  if (repoInfo) {
    log.success(`Detected repo: ${chalk.cyan(`${repoInfo.owner}/${repoInfo.repo}`)}`);
  } else {
    log.warn('Could not detect GitHub repo from git remote. Continuing anyway.');
  }

  log.blank();

  // ─── Step 2: Ask questions ───────────────────────────────────────────────
  log.title('Configure LazyKit');
  log.blank();

  const label = await ask('Label name to trigger Claude', 'lazykit');

  const stack = await ask('What is your stack?', 'e.g. TypeScript + Next.js, Postgres');

  const lintCommand = await ask('Lint command', 'npm run lint');

  const testCommand = await ask('Test command', 'npm test');

  const wantClaudeMd = await confirm('Generate CLAUDE.md project guide?', true);

  log.blank();

  // ─── Step 3: Create workflow file ────────────────────────────────────────
  const spinner = ora({ text: 'Creating workflow file...', color: 'cyan' }).start();

  const workflowDir = path.join(process.cwd(), '.github', 'workflows');
  fs.mkdirSync(workflowDir, { recursive: true });

  const workflowPath = path.join(workflowDir, 'lazykit.yml');
  const workflowContent = generateWorkflow({ label, lintCommand, testCommand });
  fs.writeFileSync(workflowPath, workflowContent);

  spinner.succeed(chalk.green('Created .github/workflows/lazykit.yml'));

  // ─── Step 4: Create CLAUDE.md ────────────────────────────────────────────
  if (wantClaudeMd) {
    const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
    const claudeMdContent = generateClaudeMd({ stack, lintCommand, testCommand });

    if (fs.existsSync(claudeMdPath)) {
      const overwrite = await confirm('CLAUDE.md already exists. Overwrite?', false);
      if (overwrite) {
        fs.writeFileSync(claudeMdPath, claudeMdContent);
        log.success('Updated CLAUDE.md');
      } else {
        log.warn('Skipped CLAUDE.md — keeping existing file.');
      }
    } else {
      fs.writeFileSync(claudeMdPath, claudeMdContent);
      log.success('Created CLAUDE.md');
    }
  }

  // ─── Step 5: Create GitHub label ─────────────────────────────────────────
  const ghAvailable = isGhCliAvailable();

  if (ghAvailable && repoInfo) {
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
        labelSpinner.warn(chalk.yellow(`Could not create label automatically — you'll need to create it manually`));
      }
    }
  } else {
    log.warn(`gh CLI not found — create the '${label}' label manually on GitHub`);
  }

  // ─── Step 6: Done! Print final instructions ───────────────────────────────
  console.log('\n' + chalk.bold.green('  ✨ LazyKit is almost ready!\n'));
  log.divider();

  console.log(chalk.bold('\n  One manual step — add your Claude token as a repo secret:\n'));

  console.log(chalk.gray('  1.') + ' Run in your terminal:');
  console.log(chalk.cyan('       claude setup-token'));

  console.log(chalk.gray('\n  2.') + ' Copy the token it prints  ' + chalk.gray('(sk-ant-oat01-...)'));

  if (repoInfo) {
    console.log(chalk.gray('\n  3.') + ' Go to:');
    console.log(chalk.cyan(`       https://github.com/${repoInfo.owner}/${repoInfo.repo}/settings/secrets/actions`));
  } else {
    console.log(chalk.gray('\n  3.') + ' Go to:');
    console.log(chalk.cyan('       Your repo → Settings → Secrets and variables → Actions'));
  }

  console.log(chalk.gray('\n  4.') + ' Click ' + chalk.bold('"New repository secret"') + ' and add:');
  console.log(chalk.gray('       Name:  ') + chalk.cyan('CLAUDE_CODE_OAUTH_TOKEN'));
  console.log(chalk.gray('       Value: ') + chalk.cyan('the token you copied'));

  console.log(chalk.gray('\n  5.') + ' Also enable PR creation:');
  if (repoInfo) {
    console.log(chalk.cyan(`       https://github.com/${repoInfo.owner}/${repoInfo.repo}/settings/actions`));
  } else {
    console.log(chalk.cyan('       Repo → Settings → Actions → General → Workflow permissions'));
  }
  console.log(chalk.gray('       Enable: ') + '"Allow GitHub Actions to create and approve pull requests"');

  log.divider();

  console.log(chalk.bold('\n  Then commit and push the new files:\n'));
  console.log(chalk.cyan('    git add .github/workflows/lazykit.yml' + (wantClaudeMd ? ' CLAUDE.md' : '')));
  console.log(chalk.cyan('    git commit -m "Add LazyKit automation"'));
  console.log(chalk.cyan('    git push'));

  log.divider();

  console.log(chalk.bold('\n  Done! Here is how to use it:\n'));
  console.log(`  ${chalk.gray('1.')} Open a GitHub issue describing what you want`);
  console.log(`  ${chalk.gray('2.')} Apply the ${chalk.bold.magenta(label)} label`);
  console.log(`  ${chalk.gray('3.')} Watch Claude open a PR with the changes\n`);

  console.log(chalk.bold.white('  🦥  LazyKit is ready. Go be lazy.\n'));
}

module.exports = { init };
