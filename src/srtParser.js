'use strict';

function timecodeToMs(tc) {
  const m = /^(\d+):(\d{2}):(\d{2})[,.](\d{1,3})$/.exec(tc.trim());
  if (!m) {
    throw new Error(`不正なタイムコードです: "${tc}"`);
  }
  const [, h, min, s, ms] = m;
  const msPadded = ms.padEnd(3, '0');
  return (
    (parseInt(h, 10) * 3600 + parseInt(min, 10) * 60 + parseInt(s, 10)) * 1000 +
    parseInt(msPadded, 10)
  );
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * SRTテキストをパースする。
 * @param {string} srtText
 * @returns {{index: number, startMs: number, endMs: number, text: string}[]}
 */
function parseSrt(srtText) {
  const normalized = stripBom(srtText).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const blocks = normalized.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);

  const entries = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    if (lines.length < 2) continue;

    let cursor = 0;
    // 1行目がインデックス番号のみの場合はスキップ（無くても許容）
    if (/^\d+$/.test(lines[cursor].trim())) {
      cursor += 1;
    }

    const timeLine = lines[cursor];
    const timeMatch = /(\d+:\d{2}:\d{2}[,.]\d{1,3})\s*-->\s*(\d+:\d{2}:\d{2}[,.]\d{1,3})/.exec(
      timeLine
    );
    if (!timeMatch) continue;
    cursor += 1;

    const startMs = timecodeToMs(timeMatch[1]);
    const endMs = timecodeToMs(timeMatch[2]);
    const text = lines
      .slice(cursor)
      .join('\\N')
      .trim();

    entries.push({
      index: entries.length + 1,
      startMs,
      endMs,
      text,
    });
  }

  return entries;
}

module.exports = { parseSrt, timecodeToMs };
