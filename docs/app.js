'use strict';

const vpdFileEl = document.getElementById('vpdFile');
const srtFileEl = document.getElementById('srtFile');
const statusEl = document.getElementById('status');
const runBtn = document.getElementById('runBtn');

function withoutExt(name) {
  return name.replace(/\.[^./\\]+$/, '');
}

function showStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.className = isError ? 'err' : 'ok';
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('ファイルの読み込みに失敗しました'));
    reader.readAsText(file);
  });
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

runBtn.addEventListener('click', async () => {
  statusEl.className = '';
  const vpdFile = vpdFileEl.files[0];
  const srtFile = srtFileEl.files[0];

  if (!vpdFile) return showStatus('VPDファイルを選択してください', true);
  if (!srtFile) return showStatus('SRTファイルを選択してください', true);

  runBtn.disabled = true;
  runBtn.textContent = '変換中...';
  try {
    const [vpdText, srtText] = await Promise.all([
      readFileAsText(vpdFile),
      readFileAsText(srtFile),
    ]);

    let vpdObj;
    try {
      vpdObj = JSON.parse(vpdText);
    } catch (e) {
      throw new Error(`VPDファイルのJSON解析に失敗しました: ${e.message}`);
    }

    const srtEntries = parseSrt(srtText);
    if (srtEntries.length === 0) {
      throw new Error('SRTファイルから字幕エントリを読み取れませんでした');
    }

    const newVpd = replaceSubtitleTrack(vpdObj, srtEntries);
    const filename = `${withoutExt(vpdFile.name)}_out.vpd`;

    downloadText(filename, JSON.stringify(newVpd, null, 4));

    showStatus(`変換が完了しました。\n字幕エントリ数: ${srtEntries.length}\nダウンロード: ${filename}`, false);
  } catch (err) {
    showStatus(`エラー: ${err.message}`, true);
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '変換して ダウンロード';
  }
});
