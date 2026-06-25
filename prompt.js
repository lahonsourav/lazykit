'use strict';

const readline = require('readline');
const chalk = require('chalk');

function ask(question, defaultValue = '') {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const display = defaultValue
      ? `  ${chalk.bold(question)} ${chalk.gray(`(${defaultValue})`)} › `
      : `  ${chalk.bold(question)} › `;

    rl.question(display, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

function confirm(question, defaultValue = true) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const hint = defaultValue ? chalk.gray('Y/n') : chalk.gray('y/N');
    rl.question(`  ${chalk.bold(question)} ${hint} › `, (answer) => {
      rl.close();
      if (!answer.trim()) return resolve(defaultValue);
      resolve(answer.trim().toLowerCase() === 'y');
    });
  });
}

function select(question, options) {
  return new Promise((resolve) => {
    console.log(`\n  ${chalk.bold(question)}`);
    options.forEach((opt, i) => {
      console.log(`  ${chalk.gray(`${i + 1}.`)} ${opt.label}`);
    });

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(`\n  ${chalk.gray('Enter number')} › `, (answer) => {
      rl.close();
      const index = parseInt(answer.trim()) - 1;
      if (index >= 0 && index < options.length) {
        resolve(options[index].value);
      } else {
        resolve(options[0].value);
      }
    });
  });
}

module.exports = { ask, confirm, select };
