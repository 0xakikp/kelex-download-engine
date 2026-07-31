export interface TorrentSearchResult {
  title: string;
  magnet: string;
  size: string;
  seeds: number;
  leechers: number;
  category: string;
}

export async function searchPublicTorrents(query: string): Promise<TorrentSearchResult[]> {
  const url = `https://apibay.org/q.php?q=${encodeURIComponent(query)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = (await res.json()) as any[];
    if (!Array.isArray(data) || data.length === 0 || data[0].id === '0') return [];

    return data.slice(0, 15).map(item => {
      const infoHash = item.info_hash;
      const magnet = `magnet:?xt=urn:btih:${infoHash}&dn=${encodeURIComponent(item.name)}`;
      const bytes = Number(item.size) || 0;
      const sizeMB = (bytes / (1024 * 1024)).toFixed(1) + ' MB';

      return {
        title: item.name,
        magnet,
        size: sizeMB,
        seeds: Number(item.seeders) || 0,
        leechers: Number(item.leechers) || 0,
        category: 'Torrent',
      };
    });
  } catch {
    return [];
  }
}
