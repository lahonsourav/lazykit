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

module.exports = { getGitRemote, parseGitHubRepo, isGitRepo, isGhCliAvailable };
