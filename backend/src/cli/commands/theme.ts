import chalk from 'chalk';
import { setTheme, themes } from '../styles.js';

export async function changeTheme(name: string): Promise<void> {
  if (!name || name === 'list') {
    console.log();
    console.log(chalk.bold('Available Kelex Themes:'));
    for (const [key, t] of Object.entries(themes)) {
      console.log(`  • ${chalk.bold(key.padEnd(10))} - ${t.name}`);
    }
    console.log();
    console.log(chalk.gray('Switch theme with: kelex theme <name>'));
    console.log();
    return;
  }

  const theme = setTheme(name);
  console.log();
  console.log(chalk.green(`✓ Switched theme to ${chalk.bold(theme.name)}`));
  console.log();
}
