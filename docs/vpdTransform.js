'use strict';

const DEFAULT_DIALOGUE_TEMPLATE = {
  layer: 0,
  style: 'style1',
  name: '',
  ml: 0,
  mr: 0,
  mv: 0,
  effect: '',
  animation: 0,
  has_default: false,
  animation_delay: 0,
  animation_time: 800,
  fontname: 'UDDigiKyokashoN',
  fontsize: 72.0,
  bold: 0,
  italic: false,
  underline: false,
  textAlign: 1,
  alignment: 2,
  space: 0.0,
  rotation: 0.0,
  scale: 100.0,
  posX: 0.5,
  posY: 0.95,
  blendMode: 0,
  blendOpacity: 100,
  color_mode: 0,
  fColor: 4294967295,
  fOpacity: 100,
  gStart: 4294967295,
  gStop: 4278190080,
  gOpacity: 100,
  gAngle: 0,
  bdEnable: false,
  bdColor: 4278190080,
  bdSize: 0,
  bdOpacity: 100,
  bdBlur: 0,
  sdEnable: false,
  sdType: 0,
  sdColor: 4294901760,
  sdOpacity: 100,
  sdDist: 5,
};

const DEFAULT_STYLES_TEMPLATE = [
  {
    idx: 0,
    name: 'style1',
    fname: 'Arial',
    fsize: 48.0,
    c1: 4294967295,
    c2: 3690987520,
    c3: 4278190080,
    c4: 3690987520,
    bold: false,
    italic: false,
    underline: false,
    strikeOut: false,
    scalex: 100,
    scaley: 100,
    spacing: 0,
    angle: 0,
    borderStyle: 1,
    outline: 2.0,
    shadow: 2.0,
    alignment: 2,
    ml: 10,
    mr: 10,
    mv: 10,
    encoding: 1,
  },
];

const DEFAULT_BLOCK_META = {
  background: 301757439,
  foreground: 1216461823,
  width: 1080,
  height: 1920,
  version: 1,
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function newUuid() {
  const c = typeof crypto !== 'undefined' ? crypto : undefined;
  if (c && typeof c.randomUUID === 'function') {
    return `{${c.randomUUID().toUpperCase()}}`;
  }
  // フォールバック（randomUUIDが利用できない環境向け）
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const uuid = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  return `{${uuid.toUpperCase()}}`;
}

function findSubtitleTrack(vpd) {
  const subitems = vpd && vpd.timeline && vpd.timeline.subitems;
  if (!Array.isArray(subitems)) {
    throw new Error('VPDファイルの構造が不正です（timeline.subitemsが見つかりません）');
  }
  const track = subitems.find((item) => item.type === 'SubtitleTrack');
  if (!track) {
    throw new Error('VPDファイル内に字幕トラック（SubtitleTrack）が見つかりません');
  }
  return track;
}

/**
 * 既存の字幕トラック内の最初のTextEffectBlockをテンプレートとして抽出する。
 * 存在しない場合はデフォルトテンプレートを返す。
 */
function extractTemplate(track) {
  const first =
    Array.isArray(track.subitems) && track.subitems.length > 0 ? track.subitems[0] : null;

  if (!first) {
    return {
      background: DEFAULT_BLOCK_META.background,
      foreground: DEFAULT_BLOCK_META.foreground,
      dialogue: deepClone(DEFAULT_DIALOGUE_TEMPLATE),
      styles: deepClone(DEFAULT_STYLES_TEMPLATE),
      width: DEFAULT_BLOCK_META.width,
      height: DEFAULT_BLOCK_META.height,
      version: DEFAULT_BLOCK_META.version,
    };
  }

  const attr = first.attribute || {};
  const dialogue =
    Array.isArray(attr.dialogues) && attr.dialogues.length > 0
      ? deepClone(attr.dialogues[0])
      : deepClone(DEFAULT_DIALOGUE_TEMPLATE);
  const styles = Array.isArray(attr.styles) ? deepClone(attr.styles) : deepClone(DEFAULT_STYLES_TEMPLATE);

  return {
    background: first.background ?? DEFAULT_BLOCK_META.background,
    foreground: first.foreground ?? DEFAULT_BLOCK_META.foreground,
    dialogue,
    styles,
    width: attr.width ?? DEFAULT_BLOCK_META.width,
    height: attr.height ?? DEFAULT_BLOCK_META.height,
    version: attr.version ?? DEFAULT_BLOCK_META.version,
  };
}

function buildSubtitleBlock(entry, index, template) {
  const durationMs = entry.endMs - entry.startMs;
  const dialogue = deepClone(template.dialogue);
  dialogue.idx = 0;
  dialogue.start = 0;
  dialogue.end = durationMs;
  dialogue.text = entry.text;

  return {
    title: '字幕 1',
    type: 'TextEffectBlock',
    background: template.background,
    foreground: template.foreground,
    status: index === 0 ? 0 : 1,
    uuid: newUuid(),
    tstart: entry.startMs,
    tduration: durationMs,
    restype: 'TextEffectResource',
    resid: 'subtitle_001',
    attribute: {
      dialogues: [dialogue],
      styles: deepClone(template.styles),
      width: template.width,
      height: template.height,
      version: template.version,
      leftTimestamp: 0.0,
      rightTimestamp: durationMs / 1000,
    },
  };
}

function recomputeSaveTime(vpd, now = new Date()) {
  if (!vpd.projinfo) return;
  vpd.projinfo.savetime = {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
    second: now.getSeconds(),
  };
}

/**
 * VPDオブジェクトの字幕トラックをSRTエントリ配列の内容で置き換えた新しいオブジェクトを返す。
 * @param {object} vpdObj
 * @param {{index:number,startMs:number,endMs:number,text:string}[]} srtEntries
 */
function replaceSubtitleTrack(vpdObj, srtEntries) {
  const vpd = deepClone(vpdObj);
  const track = findSubtitleTrack(vpd);
  const template = extractTemplate(track);

  const newBlocks = srtEntries.map((entry, i) => buildSubtitleBlock(entry, i, template));
  track.subitems = newBlocks;

  const maxEnd = newBlocks.reduce((max, b) => Math.max(max, b.tstart + b.tduration), 0);
  track.context = maxEnd;

  const topContext = (vpd.timeline.subitems || []).reduce(
    (max, item) => Math.max(max, typeof item.context === 'number' ? item.context : 0),
    0
  );
  vpd.timeline.context = topContext;

  recomputeSaveTime(vpd);

  return vpd;
}
