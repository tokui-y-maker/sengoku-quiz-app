# 戦国時代クイズアプリ

ローカルで動く、戦国時代に特化した4択クイズWebアプリです。
HTML / CSS / JavaScript のみ（依存なし）で動作します。

## できること

- 4択クイズ
- 1回10問の出題（通常モード）
- 回答後に正誤表示 + 解説表示
- 10問終了時にスコア表示（正解数・正解率）
- 間違えた問題だけ解ける復習モード
- 問題データは `questions.json` で管理
- スマホ対応UI

## ファイル

- `index.html`
- `style.css`
- `app.js`
- `questions.json`（戦国時代のサンプル50問）
- `README.md`

## 起動方法

`questions.json` を `fetch` で読むため、`file://` ではなくローカルサーバーで起動してください。

### Python

```bash
cd /workspace/sengoku-quiz-app
python3 -m http.server 8000
```

ブラウザで以下を開く:

- PC: `http://localhost:8000`
- iPhone（同じWi-Fi）: `http://<PCのローカルIP>:8000`

## 問題データの形式

`questions.json` の各問題は以下の形です。

```json
{
  "id": 1,
  "question": "問題文",
  "choices": ["A", "B", "C", "D"],
  "answerIndex": 0,
  "explanation": "解説",
  "tags": ["人物", "合戦"],
  "era": "戦国中期"
}
```

- `choices` は4件
- `answerIndex` は0〜3

