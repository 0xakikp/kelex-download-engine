import chalk from 'chalk';
import { api, apiDelete } from '../client.js';
import { header, box, formatSize } from '../styles.js';

interface FileEntry {
  name: string;
  size: number;
  type: string;
  modified: string;
  path: string;
}

const typeIcons: Record<string, string> = {
  video: '🎬',
  audio: '🎵',
  document: '📄',
  archive: '📦',
  image: '🖼️',
  program: '⚙️',
  disk: '💿',
  torrent: '🧲',
  unknown: '📎',
};

export async function listFiles(): Promise<void> {
  const data = await api('/api/v1/files');
  const files: FileEntry[] = data.files || [];

  console.log();
  console.log(header('Downloaded Files'));
  console.log();

  if (files.length === 0) {
    box('Status', chalk.gray('No downloaded files yet.'));
    return;
  }

  for (const f of files) {
    const icon = typeIcons[f.type] || typeIcons.unknown;
    console.log(`${icon} ${chalk.white(f.name)}`);
    console.log(`   ${chalk.gray(formatSize(f.size))} · ${chalk.gray(f.type)} · ${new Date(f.modified).toLocaleString()}`);
    console.log(`   ${chalk.gray(f.path)}`);
    console.log();
  }
}

export async function deleteFile(name: string): Promise<void> {
  await apiDelete(`/api/v1/files/${encodeURIComponent(name)}`);
  console.log(chalk.gray(`🗑 Deleted ${name}`));
}
