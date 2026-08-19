# 環境構築手順

ローカル開発環境を最初から動かすまでの手順です。デプロイやインフラ構築は [Deployment](DEPLOYMENT.md) を参照してください。

## 構成の概要

このリポジトリは pnpm workspace + Turborepo のモノレポです。

| パッケージ | 名前 | 役割 |
| --- | --- | --- |
| `frontend/` | `@front-template/frontend` | TanStack Start の UI と Worker (`front-template-web`) |
| `backend/` | `@front-template/backend` | Hono API、Better Auth、Drizzle スキーマ、D1、R2 (`front-template-api`) |
| `packages/api/` | `@front-template/api` | 型付きの Hono RPC クライアント |

ローカルではフロントエンドとバックエンドを別プロセスで起動し、Vite の dev server が `/api` をバックエンドへプロキシします。

| プロセス | ポート |
| --- | --- |
| Frontend (Vite) | 3000 |
| Backend (Wrangler) | 8787 |
| ブラウザからのアクセス先 | 3000 |

## 前提条件

- [mise](https://mise.jdx.dev/) がインストールされていること
- Git
- Google アカウント（ログイン機能を動かす場合のみ。API だけ触るなら不要）

Node.js と pnpm は mise が管理するため、ホストへ個別にインストールする必要はありません。

mise が未インストールの場合は次のいずれかで導入します。

```bash
# Homebrew
brew install mise

# インストーラ
curl https://mise.run | sh
```

導入後、シェルへの有効化（`mise activate`）を済ませておくと `mise exec -- ` の入力を省けます。詳細は [mise のドキュメント](https://mise.jdx.dev/getting-started.html) を参照してください。

## 1. リポジトリを取得する

```bash
git clone git@github.com:YumNumm/front-template.git
cd front-template
```

## 2. ツールチェーンをインストールする

```bash
mise install
```

`mise.toml` に固定されたバージョンの Node.js、pnpm、hk、pkl、sops、gcloud、OpenTofu、gitleaks、pinact、zizmor、shellcheck が入ります。バージョンは `mise.lock` で固定されているため、全員が同じものを使用します。

インストール結果は次で確認できます。

```bash
mise ls
```

## 3. 依存関係をインストールする

```bash
mise exec -- pnpm install
```

- パッケージマネージャは pnpm のみです。npm / Yarn / Bun / `npx` は使用しないでください。`preinstall` フックが pnpm 以外の実行を検出してエラーにします。
- `mise` の `postinstall` フックにより `hk install --mise` が実行され、Git の pre-commit フックが設定されます。コミット時にマージコンフリクト痕、シンボリックリンク、秘密鍵、gitleaks によるシークレット検出などが自動でチェックされます。

## 4. 環境変数を設定する

バックエンドはローカル実行時に `backend/.dev.vars` を読み込みます。このファイルは Git 管理外です。

```bash
cp backend/.dev.vars.example backend/.dev.vars
```

`backend/.dev.vars` には次の 3 つを設定します。

| 変数 | 内容 |
| --- | --- |
| `BETTER_AUTH_SECRET` | Better Auth のセッション署名用シークレット |
| `GOOGLE_CLIENT_ID` | Google OAuth クライアント ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth クライアントシークレット |

### BETTER_AUTH_SECRET を生成する

任意のランダム文字列で構いません。

```bash
openssl rand -base64 32
```

### Google OAuth クライアントを用意する

ローカルでログインを試す場合のみ必要です。

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) で「認証情報を作成」→「OAuth クライアント ID」を選択します。
2. アプリケーションの種類は「ウェブ アプリケーション」を選択します。
3. 「承認済みのリダイレクト URI」に次を **完全一致** で追加します。

   ```text
   http://localhost:3000/api/auth/callback/google
   ```

4. 発行されたクライアント ID とクライアントシークレットを `backend/.dev.vars` に記入します。

リダイレクト先が 3000 番なのは、ブラウザからのアクセス元が Vite dev server であり、`/api` がバックエンドへプロキシされるためです。`backend/wrangler.jsonc` の `BETTER_AUTH_URL` もローカル既定値として `http://localhost:3000` を指しています。

> [!WARNING]
> `.dev.vars` や生成したシークレットは絶対にコミットしないでください。本番用のシークレットは sops で暗号化した `.env.enc.json` で管理します（[Deployment](DEPLOYMENT.md) 参照）。

## 5. ローカルデータベースを初期化する

Cloudflare D1 のローカルストアにマイグレーションを適用します。

```bash
mise exec -- pnpm --filter @front-template/backend db:push:local
```

スキーマ (`backend/src/lib/schema.ts`) を変更したときは、マイグレーションを生成してから再度適用します。

```bash
mise exec -- pnpm --filter @front-template/backend db:generate
mise exec -- pnpm --filter @front-template/backend db:push:local
```

詳細は [Database setup](DATABASE_SETUP.md) を参照してください。

## 6. 開発サーバーを起動する

フロントエンドとバックエンドをまとめて起動します。

```bash
mise exec -- pnpm dev
```

<http://localhost:3000> を開きます。

個別に起動したい場合は次のようにします。

```bash
# バックエンドのみ (http://localhost:8787)
mise exec -- pnpm --filter @front-template/backend dev

# フロントエンドのみ (http://localhost:3000)
mise exec -- pnpm --filter @front-template/frontend dev
```

## 7. 動作を確認する

ヘルスチェックエンドポイントで API の疎通を確認します。

```bash
# バックエンドへ直接
curl http://localhost:8787/api/v1/health

# フロントエンドのプロキシ経由
curl http://localhost:3000/api/v1/health
```

いずれも `{"ok":true}` が返れば正常です。

ログインを確認する場合は <http://localhost:3000/login> から Google でサインインし、`/me` で自分の情報が表示されることを確認します。

## 日常的に使うコマンド

すべてリポジトリルートで実行します。

| コマンド | 内容 |
| --- | --- |
| `mise exec -- pnpm dev` | 全パッケージの開発サーバーを起動 |
| `mise exec -- pnpm build` | 全パッケージをビルド |
| `mise exec -- pnpm lint` | oxlint（型情報あり）で静的解析 |
| `mise exec -- pnpm lint:fix` | oxlint の自動修正 |
| `mise exec -- pnpm format` | oxfmt でフォーマット差分をチェック |
| `mise exec -- pnpm format:fix` | oxfmt で整形 |
| `mise exec -- pnpm check-types` | tsgo による型チェック |
| `mise exec -- pnpm test` | Vitest でテスト実行 |
| `mise exec -- pnpm check` | lint・format・型チェック・テストを一括実行 |

CI（`.github/workflows/ci.yaml`）は `pnpm check` と、gitleaks / pinact / zizmor によるセキュリティチェックを実行します。プッシュ前に `mise exec -- pnpm check` を通しておくと手戻りが減ります。

依存関係の追加・削除は必ず pnpm 経由で行い、`package.json` のバージョン範囲やロックファイルを手で編集しないでください。

```bash
mise exec -- pnpm --filter @front-template/frontend add <package>
mise exec -- pnpm --filter @front-template/backend remove <package>
```

## エディタ設定

VS Code を使う場合、`.vscode/extensions.json` の推奨拡張機能をインストールしてください。ワークスペースを開くと推奨が表示されます。

| 拡張機能 | 用途 |
| --- | --- |
| `oxc.oxc-vscode` | oxlint / oxfmt 連携（保存時フォーマット） |
| `typescriptteam.native-preview` | TypeScript native preview (tsgo) |
| `hverlin.mise-vscode` | mise が管理するツールをエディタから利用 |
| `DavidAnson.vscode-markdownlint` | Markdown の lint |
| `tombi-toml.tombi` | TOML サポート |
| `opentofu.vscode-opentofu` | OpenTofu サポート |

`.vscode/settings.json` で保存時フォーマットとコミット署名が有効になっています。

## トラブルシューティング

### `error: this repository requires pnpm (via mise).`

npm や Yarn で `install` を実行しています。`mise exec -- pnpm install` を使用してください。

### `Unsupported engine` / Node.js のバージョンエラー

`mise install` が完了していないか、mise がシェルで有効化されていない可能性があります。`mise ls` で Node.js 26.7.0 と pnpm 11.22.0 が入っているかを確認し、コマンドは `mise exec -- ` を付けて実行してください。

### `no such table` などのデータベースエラー

ローカル D1 にマイグレーションが未適用です。

```bash
mise exec -- pnpm --filter @front-template/backend db:push:local
```

### ログイン時に `redirect_uri_mismatch` が出る

Google Cloud Console 側のリダイレクト URI が `http://localhost:3000/api/auth/callback/google` と完全一致しているかを確認してください。末尾のスラッシュやポート番号の違いでも失敗します。

### API が 500 を返す / 認証が動かない

`backend/.dev.vars` が作成され、3 つの値がすべて埋まっているかを確認してください。ファイルを変更したら Wrangler を再起動する必要があります。

### ポートが使用中

3000 番または 8787 番を使っている別プロセスを停止してください。ポートは `frontend/vite.config.ts` と `backend/package.json` の `dev` スクリプトで定義されています。

### pre-commit フックが動かない

`mise exec -- pnpm install` の postinstall で `hk install --mise` が走ります。動作していない場合は手動で実行してください。

```bash
mise exec -- hk install --mise
```

コミット前に同じチェックを手元で走らせるには次を実行します。

```bash
mise exec -- hk check
```

## 次に読むもの

- [Database setup](DATABASE_SETUP.md) — Drizzle と D1 の運用
- [Deployment](DEPLOYMENT.md) — OpenTofu によるインフラ構築と CI/CD
- [Agent guidelines](../AGENTS.md) — モノレポの境界とコーディング規約
