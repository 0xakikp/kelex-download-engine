import chalk from 'chalk';
import { apiPost } from '../client.js';

export async function setSpeedLimit(limit: string): Promise<void> {
  const data = await apiPost('/api/v1/system/speed-limit', { limit });
  console.log();
  console.log(chalk.cyan(`⚡ ${data.message || `Speed limit set to ${limit}`}`));
  console.log();
}
