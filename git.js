'use strict';

const { execSync } = require('child_process');

function getGitRemote() {
  try {
    const remote = execSync('git remote get-url origin', { stdio: 'pipe' })
      .toString()
      .trim();
    return remote;
  } catch {
    return null;
  }
}

function parseGitHubRepo(remoteUrl) {
  if (!remoteUrl) return null;

  // Handle SSH: git@github.com:owner/repo.git
  const sshMatch = remoteUrl.match(/git@github\.com[:/](.+?)\/(.+?)(?:\.git)?$/);
  if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };

  // Handle HTTPS: https://github.com/owner/repo.git
  const httpsMatch = remoteUrl.match(/https?:\/\/github\.com\/(.+?)\/(.+?)(?:\.git)?$/);
  if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };

  return null;
}

function isGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isGhCliAvailable() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function isGhAuthenticated() {
  try {
    execSync('gh auth status', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function detectStack() {
  const cwd = process.cwd();
  const stack = [];

  const pkgPath = require('path').join(cwd, 'package.json');
  if (require('fs').existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(require('fs').readFileSync(pkgPath, 'utf8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['next']) stack.push('Next.js');
      else if (deps['react']) stack.push('React');
      else if (deps['vue']) stack.push('Vue');
      else if (deps['@angular/core']) stack.push('Angular');
      else if (deps['svelte']) stack.push('Svelte');
      else if (deps['express']) stack.push('Express');
      else if (deps['fastify']) stack.push('Fastify');

      if (deps['typescript'] || require('fs').existsSync(require('path').join(cwd, 'tsconfig.json'))) stack.push('TypeScript');

      if (deps['@prisma/client'] || deps['prisma']) stack.push('Prisma');
      else if (deps['mongoose']) stack.push('MongoDB');
      else if (deps['pg'] || deps['postgres']) stack.push('PostgreSQL');
      else if (deps['mysql2']) stack.push('MySQL');
    } catch {}
  }

  if (require('fs').existsSync(require('path').join(cwd, 'requirements.txt')) ||
      require('fs').existsSync(require('path').join(cwd, 'pyproject.toml'))) stack.push('Python');
  if (require('fs').existsSync(require('path').join(cwd, 'go.mod'))) stack.push('Go');
  if (require('fs').existsSync(require('path').join(cwd, 'Cargo.toml'))) stack.push('Rust');
  if (require('fs').existsSync(require('path').join(cwd, 'pom.xml')) ||
      require('fs').existsSync(require('path').join(cwd, 'build.gradle'))) stack.push('Java');

  return stack.length > 0 ? stack.join(' + ') : null;
}

function isClaudeAvailable() {
  try {
    execSync('claude --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasBranchProtection({ owner, repo }) {
  try {
    execSync(`gh api repos/${owner}/${repo}/branches/main/protection`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

module.exports = { getGitRemote, parseGitHubRepo, isGitRepo, isGhCliAvailable, isGhAuthenticated, isClaudeAvailable, detectStack, hasBranchProtection };
