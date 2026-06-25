#!/usr/bin/env node

'use strict';

const { init } = require('../src/commands/init');

const [,, command] = process.argv;

switch (command) {
  case 'init':
  case undefined:
    init().catch(err => {
      console.error('\n❌ Setup failed:', err.message);
      process.exit(1);
    });
    break;
  default:
    console.log(`
🦥  LazyKit — Drop an issue, get a PR.

Usage:
  npx lazykit init     Set up LazyKit in your current GitHub repo
`);
}
