'use strict';

const chalk = require('chalk');

const log = {
  info:    (msg) => console.log(chalk.cyan('  →'), msg),
  success: (msg) => console.log(chalk.green('  ✓'), msg),
  warn:    (msg) => console.log(chalk.yellow('  ⚠'), msg),
  error:   (msg) => console.log(chalk.red('  ✗'), msg),
  title:   (msg) => console.log('\n' + chalk.bold.white(msg)),
  divider: ()    => console.log(chalk.gray('  ' + '─'.repeat(50))),
  blank:   ()    => console.log(),
  raw:     (msg) => console.log(msg),
};

module.exports = { log };
