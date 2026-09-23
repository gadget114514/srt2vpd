'use strict';

const vpdPathEl = document.getElementById('vpdPath');
const srtPathEl = document.getElementById('srtPath');
const outFolderEl = document.getElementById('outFolder');
const outFilenameEl = document.getElementById('outFilename');
const statusEl = document.getElementById('status');
const runBtn = document.getElementById('runBtn');

function basename(p) {
  return p.split(/[\\/]/).pop();
}
function dirname(p) {
  const parts = p.split(/[\\/]/);
  parts.pop();
  return parts.join('\\');
}
function withoutExt(name) {
  return name.replace(/\.[^./\\]+$/, '');
}

function showStatus(message, isError) {
  statusEl.textContent = message;
  statusEl.className = isError ? 'err' : 'ok';
}

function suggestOutputFromVpd(vpdPath) {
  if (!outFolderEl.value) outFolderEl.value = dirname(vpdPath);
  if (!outFilenameEl.value) {
    outFilenameEl.value = `${withoutExt(basename(vpdPath))}_out.vpd`;
  }
}

document.getElementById('browseVpd').addEventListener('click', async () => {
  const p = await window.api.openVpd();
  if (p) {
    vpdPathEl.value = p;
    suggestOutputFromVpd(p);
  }
});

document.getElementById('browseSrt').addEventListener('click', async () => {
  const p = await window.api.openSrt();
  if (p) srtPathEl.value = p;
});

document.getElementById('browseFolder').addEventListener('click', async () => {
  const p = await window.api.openFolder();
  if (p) outFolderEl.value = p;
});

document.getElementById('browseSaveAs').addEventListener('click', async () => {
  const currentFolder = outFolderEl.value || (vpdPathEl.value ? dirname(vpdPathEl.value) : '');
  const currentName = outFilenameEl.value || 'output.vpd';
  const defaultPath = currentFolder ? `${currentFolder}\\${currentName}` : currentName;
  const p = await window.api.saveVpdAs(defaultPath);
  if (p) {
    outFolderEl.value = dirname(p);
    outFilenameEl.value = basename(p);
  }
});

runBtn.addEventListener('click', async () => {
  statusEl.className = '';
  runBtn.disabled = true;
  runBtn.textContent = '変換中...';
  try {
    const result = await window.api.runConvert({
      vpdPath: vpdPathEl.value.trim(),
      srtPath: srtPathEl.value.trim(),
      outFolder: outFolderEl.value.trim(),
      outFilename: outFilenameEl.value.trim(),
    });
    showStatus(`変換が完了しました。\n字幕エントリ数: ${result.count}\n出力先: ${result.outPath}`, false);
  } catch (err) {
    showStatus(`エラー: ${err.message}`, true);
  } finally {
    runBtn.disabled = false;
    runBtn.textContent = '変換実行';
  }
});
