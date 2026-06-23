/**
 * YouTube 動画URLのユーティリティ（クライアント/サーバー共用・依存ゼロ）。
 */

/** ショート/通常/youtu.be いずれの形式からも videoId を抽出する。失敗時は null。 */
export function parseYouTubeId(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      // /shorts/<id> または /embed/<id>
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "shorts" || parts[0] === "embed") return parts[1] || null;
      // /watch?v=<id>
      const v = u.searchParams.get("v");
      return v || null;
    }
    return null;
  } catch {
    return null;
  }
}

/** videoId からサムネイルURLを組み立てる。 */
export function youTubeThumbnail(id: string): string {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/** URL からサムネイルURLを導出（失敗時 null）。 */
export function youTubeThumbnailFromUrl(url: string | undefined | null): string | null {
  const id = parseYouTubeId(url);
  return id ? youTubeThumbnail(id) : null;
}
