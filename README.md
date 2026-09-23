# srt2vpd

VPDファイルの字幕トラックをSRTファイルの内容で置き換えるツールです。

## Web版

インストール不要でブラウザから使えます。処理はすべてブラウザ内で完結し、ファイルはサーバーに送信されません。

https://gadget114514.github.io/srt2vpd/

## デスクトップ版 (Electron)

```bash
npm install
npm start
```

VPDファイル・SRTファイル・出力先を指定して変換します。

## 仕組み

- `src/srtParser.js` — SRTのタイムコード・テキストをパース
- `src/vpdTransform.js` — VPD内の`SubtitleTrack`を、SRTの内容で置き換えた新しいVPDを生成

Web版（`docs/`）は同じ変換ロジックをNode依存なしで移植したものです。
