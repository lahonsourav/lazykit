#!/usr/bin/env node

'use strict';

const { init } = require('./init');
const { update } = require('./update');
const { status } = require('./status');
const { remove } = require('./remove');

const [,, command, ...args] = process.argv;
const dryRun = args.includes('--dry-run');

switch (command) {
  case 'init':
  case undefined:
    init({ dryRun }).catch(err => {
      console.error('\n  Setup failed:', err.message);
      process.exit(1);
    });
    break;
  case 'update':
    update({ dryRun }).catch(err => {
      console.error('\n  Update failed:', err.message);
      process.exit(1);
    });
    break;
  case 'status':
    status().catch(err => {
      console.error('\n  Status check failed:', err.message);
      process.exit(1);
    });
    break;
  case 'remove':
    remove().catch(err => {
      console.error('\n  Remove failed:', err.message);
      process.exit(1);
    });
    break;
  default:
    console.log(`
🦥  LazyKit — Drop an issue, get a PR.

Usage:
  npx @slahon/lazykit@latest init          Set up LazyKit in your current GitHub repo
  npx @slahon/lazykit@latest update        Regenerate workflow and CLAUDE.md
  npx @slahon/lazykit@latest status        Check if everything is wired up correctly
  npx @slahon/lazykit@latest remove        Remove LazyKit from your repo

Flags:
  --dry-run    Preview what would happen without writing files (init, update)
`);
}
