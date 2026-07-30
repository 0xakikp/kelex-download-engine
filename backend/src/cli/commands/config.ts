import chalk from 'chalk';
import { api } from '../client.js';
import { header, box } from '../styles.js';

interface Config {
  downloadDir: string;
  port: string;
  host: string;
  nodeEnv: string;
  defaultBrowser: string | null;
}

export async function showConfig(): Promise<void> {
  const config: Config = await api('/api/v1/system/config');

  console.log();
  console.log(header('Configuration'));
  console.log();

  const content = [
    `${chalk.gray('Download directory:')} ${chalk.cyan(config.downloadDir)}`,
    `${chalk.gray('Backend URL:')}        ${chalk.cyan(`http://${config.host}:${config.port}`)}`,
    `${chalk.gray('Environment:')}        ${chalk.gray(config.nodeEnv)}`,
    `${chalk.gray('Default browser:')}    ${config.defaultBrowser ? chalk.cyan(config.defaultBrowser) : chalk.gray('none')}`,
  ].join('\n');

  box('Settings', content);
  console.log();
}
