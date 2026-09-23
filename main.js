'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { parseSrt } = require('./src/srtParser');
const { replaceSubtitleTrack } = require('./src/vpdTransform');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 780,
    height: 620,
    resizable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('dialog:openVpd', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'VPDファイルを選択',
    properties: ['openFile'],
    filters: [
      { name: 'VPDファイル', extensions: ['vpd'] },
      { name: 'すべてのファイル', extensions: ['*'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:openSrt', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'SRTファイルを選択',
    properties: ['openFile'],
    filters: [
      { name: 'SRTファイル', extensions: ['srt'] },
      { name: 'すべてのファイル', extensions: ['*'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:openFolder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '出力フォルダを選択',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('dialog:saveVpdAs', async (_event, defaultPath) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: '出力先を指定して保存',
    defaultPath: defaultPath || undefined,
    filters: [
      { name: 'VPDファイル', extensions: ['vpd'] },
      { name: 'すべてのファイル', extensions: ['*'] },
    ],
  });
  if (result.canceled || !result.filePath) return null;
  return result.filePath;
});

ipcMain.handle('convert:run', async (_event, { vpdPath, srtPath, outFolder, outFilename }) => {
  if (!vpdPath) throw new Error('VPDファイルを指定してください');
  if (!srtPath) throw new Error('SRTファイルを指定してください');
  if (!outFolder) throw new Error('出力フォルダを指定してください');
  if (!outFilename) throw new Error('出力ファイル名を指定してください');

  const vpdText = fs.readFileSync(vpdPath, 'utf8');
  const srtText = fs.readFileSync(srtPath, 'utf8');

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

  const filename = outFilename.toLowerCase().endsWith('.vpd') ? outFilename : `${outFilename}.vpd`;
  fs.mkdirSync(outFolder, { recursive: true });
  const outPath = path.join(outFolder, filename);
  fs.writeFileSync(outPath, JSON.stringify(newVpd, null, 4), 'utf8');

  return { outPath, count: srtEntries.length };
});
