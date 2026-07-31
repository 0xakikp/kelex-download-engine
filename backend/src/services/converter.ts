import { exec } from 'child_process';
import { promisify } from 'util';
import { extname, join, dirname, basename } from 'path';
import { logger } from '../utils/logger.js';
import { resolveBinary } from '../utils/dependencies.js';

const execAsync = promisify(exec);

export async function convertMedia(
  inputPath: string,
  targetFormat: string,
): Promise<{ outputPath: string; format: string }> {
  const ffmpeg = await resolveBinary('ffmpeg');
  const dir = dirname(inputPath);
  const ext = extname(inputPath);
  const name = basename(inputPath, ext);
  const targetExt = targetFormat === 'mp3' ? '.mp3' : '.mp4';
  const outputPath = join(dir, `${name}_converted${targetExt}`);

  let cmd = '';
  if (targetFormat === 'mp3') {
    cmd = `"${ffmpeg}" -y -i "${inputPath}" -vn -ar 44100 -ac 2 -b:a 320k "${outputPath}"`;
  } else if (targetFormat === '720p') {
    cmd = `"${ffmpeg}" -y -i "${inputPath}" -vf "scale=-2:720" -c:v libx264 -crf 23 -preset fast "${outputPath}"`;
  } else if (targetFormat === '1080p') {
    cmd = `"${ffmpeg}" -y -i "${inputPath}" -vf "scale=-2:1080" -c:v libx264 -crf 22 -preset fast "${outputPath}"`;
  } else {
    cmd = `"${ffmpeg}" -y -i "${inputPath}" -c copy "${outputPath}"`;
  }

  logger.info({ inputPath, targetFormat, cmd }, 'Starting media conversion');
  await execAsync(cmd);
  logger.info({ outputPath }, 'Media conversion completed');
  return { outputPath, format: targetFormat };
}
