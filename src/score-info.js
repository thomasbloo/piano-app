/**
 * Title and composer of a MusicXML file, read with simple patterns so it also works outside the browser.
 * Compressed .mxl files can't be read this way, so the file name is used for them.
 * @param {string} content
 * @param {string} fileName
 */
export function scoreInfo(content, fileName) {
  const fallback = fileName.replace(/\.(musicxml|xml|mxl)$/i, '').replace(/[_-]+/g, ' ').trim();
  if (content.startsWith('PK')) return { title: fallback, composer: '' };
  const text = (/** @type {RegExp} */ pattern) => decode(pattern.exec(content)?.[1]?.trim() ?? '');
  const title = text(/<work-title>([^<]*)<\/work-title>/) || text(/<movement-title>([^<]*)<\/movement-title>/);
  const composer = text(/<creator type="composer">([^<]*)<\/creator>/);
  return { title: title || fallback, composer };
}

/** @param {string} s */
function decode(s) {
  return s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}
