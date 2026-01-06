import chalk from 'chalk';

export const logger = {
  success: (message: string) => console.log(chalk.green(`✓ ${message}`)),
  error: (message: string) => console.error(chalk.red(`✗ ${message}`)),
  warn: (message: string) => console.warn(chalk.yellow(`⚠ ${message}`)),
  info: (message: string) => console.log(chalk.blue(`ℹ ${message}`)),
  log: (message: string) => console.log(message),
};

export const logSection = (title: string) => {
  console.log();
  console.log(chalk.bold.underline(title));
  console.log();
};

export const logNextSteps = (steps: string[], projectName: string) => {
  console.log();
  console.log(chalk.bold('Next steps:'));
  console.log();
  steps
    .map((step) => step.replace('{{PROJECT_NAME}}', projectName))
    .forEach((step) => console.log(chalk.gray(`  ${step}`)));
  console.log();
};
