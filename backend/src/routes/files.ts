import type { FastifyInstance } from 'fastify';
import { readdir, stat, unlink, access } from 'fs/promises';
import { join, extname } from 'path';

const DOWNLOAD_DIR = process.env.DOWNLOAD_DIR || '/opt/kelex-downloads';

const fileTypeMap: Record<string, string> = {
  '.mp4': 'video', '.mkv': 'video', '.avi': 'video', '.webm': 'video', '.mov': 'video',
  '.mp3': 'audio', '.flac': 'audio', '.aac': 'audio', '.wav': 'audio', '.m4a': 'audio', '.ogg': 'audio',
  '.pdf': 'document', '.doc': 'document', '.docx': 'document', '.txt': 'document', '.epub': 'document',
  '.zip': 'archive', '.rar': 'archive', '.7z': 'archive', '.tar': 'archive', '.gz': 'archive',
  '.jpg': 'image', '.jpeg': 'image', '.png': 'image', '.gif': 'image', '.webp': 'image',
  '.exe': 'program', '.dmg': 'program', '.deb': 'program', '.rpm': 'program',
  '.iso': 'disk', '.torrent': 'torrent',
};

export async function fileRoutes(fastify: FastifyInstance) {
  fastify.get('/', async () => {
    const files: any[] = [];
    try {
      const entries = await readdir(DOWNLOAD_DIR);
      for (const entry of entries) {
        const path = join(DOWNLOAD_DIR, entry);
        try {
          const s = await stat(path);
          if (s.isFile()) {
            const ext = extname(entry).toLowerCase();
            files.push({
              name: entry,
              size: s.size,
              type: fileTypeMap[ext] || 'unknown',
              modified: s.mtime.toISOString(),
              path,
            });
          }
        } catch { /* skip unreadable */ }
      }
    } catch { /* directory may not exist yet */ }

    // Also check converted subdir
    try {
      const convertedDir = join(DOWNLOAD_DIR, 'converted');
      const entries = await readdir(convertedDir);
      for (const entry of entries) {
        const path = join(convertedDir, entry);
        try {
          const s = await stat(path);
          if (s.isFile()) {
            const ext = extname(entry).toLowerCase();
            files.push({
              name: entry,
              size: s.size,
              type: fileTypeMap[ext] || 'unknown',
              modified: s.mtime.toISOString(),
              path,
            });
          }
        } catch { /* skip */ }
      }
    } catch { /* converted dir may not exist */ }

    return { total: files.length, files: files.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()) };
  });

  fastify.get('/download/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const decoded = decodeURIComponent(name);
    const path = join(DOWNLOAD_DIR, decoded);
    try {
      await access(path);
      return reply.sendFile(decoded, DOWNLOAD_DIR);
    } catch (err: any) {
      return reply.status(404).send({ error: 'File not found' });
    }
  });

  fastify.delete('/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    const decoded = decodeURIComponent(name);
    const path = join(DOWNLOAD_DIR, decoded);
    try {
      await unlink(path);
      return { success: true };
    } catch (err: any) {
      return reply.status(400).send({ error: err.message });
    }
  });
}
