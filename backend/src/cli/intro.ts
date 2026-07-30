import chalk from 'chalk';
import gradient from 'gradient-string';
import boxen from 'boxen';

const KELEX_ASCII = `
██╗  ██╗███████╗██╗     ███████╗██╗  ██╗
██║ ██╔╝██╔════╝██║     ██╔════╝╚██╗██╔╝
█████╔╝ █████╗  ██║     █████╗   ╚███╔╝ 
██╔═██╗ ██╔══╝  ██║     ██╔══╝   ██╔██╗ 
██║  ██╗███████╗███████╗███████╗██╔╝ ██╗
╚═╝  ╚═╝╚══════╝╚══════╝╚══════╝╚═╝  ╚═╝
`;

const TAGLINE = 'Terminal-first Download Engine';

export function printBanner(): void {
  console.clear();
  console.log();
  console.log(gradient(['#0A84FF', '#AF52DE', '#FF3B30']).multiline(KELEX_ASCII));
  console.log(chalk.gray(TAGLINE.padStart(34)));
  console.log();
}

export async function printAnimatedBanner(): Promise<void> {
  console.clear();
  console.log();

  const lines = KELEX_ASCII.split('\n').filter(Boolean);
  const coloredLines = lines.map(line => gradient(['#0A84FF', '#AF52DE']).multiline(line));

  for (const line of coloredLines) {
    process.stdout.write(line);
    await new Promise(r => setTimeout(r, 60));
    process.stdout.write('\n');
  }

  console.log(chalk.gray(TAGLINE.padStart(34)));
  console.log();
}

export function printBox(title: string, content: string, color: string = '#0A84FF'): void {
  console.log(
    boxen(content, {
      title,
      titleAlignment: 'left',
      padding: 1,
      borderStyle: 'round',
      borderColor: color as any,
      dimBorder: false,
    })
  );
}

export function printDivider(color: string = '#1E1E1E'): void {
  const width = process.stdout.columns || 80;
  console.log(chalk.hex(color)('─'.repeat(width)));
}

export function gradientText(text: string, colors: string[] = ['#0A84FF', '#AF52DE']): string {
  return gradient(colors)(text);
}
