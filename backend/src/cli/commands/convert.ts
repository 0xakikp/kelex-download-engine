import chalk from 'chalk';
import { apiPost } from '../client.js';

export async function convertMediaCLI(idOrPath: string, format = 'mp3'): Promise<void> {
  console.log();
  console.log(chalk.cyan(`🔄 Converting ${idOrPath} to ${format.toUpperCase()}...`));
  try {
    const res = await apiPost(`/api/v1/downloads/${encodeURIComponent(idOrPath)}/convert`, { format });
    console.log(chalk.green(`✓ Conversion completed: ${res.outputPath || idOrPath}`));
  } catch (err: any) {
    console.log(chalk.red(`❌ Conversion failed: ${err.message}`));
  }
  console.log();
}
