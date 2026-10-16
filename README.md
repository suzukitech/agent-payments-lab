# agent-payments-lab

連載「AIエージェントに財布を持たせる」のコード置き場。**テストネット（Base Sepolia）のみ。本番資産・実貨幣は一切使わない。**

| 回 | タグ | 内容 |
|---|---|---|
| 1 | `x402-01` | Next.js で x402 の有料 API を作り、402 を受け取る（`apps/paid-api`） |
| 2 | `x402-02` | 上限付きで自動支払いするクライアント（`apps/agent-client`） |
| 3 | `x402-03` | x402 × MCP: 財布サーバー（`apps/wallet-mcp`）と有料 MCP ツール（`apps/paid-mcp`） |

## 第1回: HTTP 402 を Next.js で動かす

- `GET /api/free` は 200、`GET /api/weather` は `withX402` で保護（$0.01、`eip155:84532`）
- ファシリテーターは `https://x402.org/facilitator`（テストネット用）
- 支払いクライアントの最小例は `apps/paid-api/scripts/pay.ts`（第2回の前振り）
- 実測: ETH 0 の買い手が 0.01 USDC を支払い 200 を取得（tx は run.md）
- シーケンス図: `docs/diagrams/x402-01-sequence.mmd`、実行記録: `docs/notes/`

## 第2回: 自動で支払うクライアント

```bash
pnpm buy <url> [--max-per-call <usd>] [--max-total <usd>]   # 既定は 0.01 / 0.05
pnpm buy http://localhost:3000/api/weather
pnpm buy https://paid-api-flax.vercel.app/api/weather      # 公開URL（テストネット、$0.01/回）
```

- 1回あたりの上限は `@x402/fetch` の `spendControls`（SDK の既定は $1）、累計上限は `onBeforePaymentCreation` + `apps/agent-client/.x402-spend.json`（gitignore 済み）
- 終了コードは 0（200）、1（200 以外）、2（署名前に停止）。`pnpm buy` 経由だと 2 が 1 に潰れるので、見たいときは `cd apps/agent-client && ./node_modules/.bin/tsx --env-file=../../.env src/buy.ts <url>`（`pnpm exec` でも潰れる）
- 送る `PAYMENT-SIGNATURE` と受け取る `PAYMENT-RESPONSE` をデコードして表示
- 失敗系の検証用に `/api/flaky`（ハンドラが 500 を返す）と `/api/throw`（throw する）を追加
- フロー図: `docs/diagrams/x402-02-client-flow.mmd`、実行記録: `docs/notes/x402-02-*.md`
- 公開 URL: https://paid-api-flax.vercel.app （Vercel。環境変数は `PAY_TO_ADDRESS` のみ。買い手の鍵は置かない）

## 第3回: MCP（財布サーバー）

鍵・上限・累計台帳を持つ唯一のプロセスが `apps/wallet-mcp`（stdio）。Claude Code には x402 の支払い機能が無いので、Claude から見えるのは `get_weather` / `get_weather_via_mcp` の2ツールだけ。

```bash
# 1. 財布の置き場（リポジトリ外）。WALLET_HOME で変更可、既定 ~/.agent-payments-lab
mkdir -p ~/.agent-payments-lab && chmod 700 ~/.agent-payments-lab
grep '^BUYER_PRIVATE_KEY=' .env > ~/.agent-payments-lab/wallet.env
echo '{"maxPerCall":"0.01","maxTotal":"0.05"}' > ~/.agent-payments-lab/config.json
chmod 600 ~/.agent-payments-lab/*       # spend.json（累計）は初回起動で作られる

# 2. 構成(a)の売り手: 有料 MCP サーバー（http://127.0.0.1:3001/mcp、$0.01）
pnpm --filter paid-mcp dev

# 3. Claude Code に登録（構成(b)の get_weather だけなら 2 は不要）
claude mcp add --transport stdio wallet -- pnpm --silent -C "$PWD/apps/wallet-mcp" start

# 疎通確認（Claude を介さず MCP クライアントから）
cd apps/wallet-mcp && ./node_modules/.bin/tsx src/probe.ts [get_weather] [get_weather_via_mcp]
```

- `get_weather`（構成b）は `PAID_API_URL`（既定は公開 URL）を `@x402/fetch` で買う。`get_weather_via_mcp`（構成a）は `PAID_MCP_URL`（既定 `http://localhost:3001/mcp`）を `@x402/mcp` で買う
- 上限は第2回と同じロジックを両ツールで共有。超過時は支払わず `isError: true`。成功時は結果・tx・今回額・累計を返す
- stdout は JSON-RPC 専用。ログは stderr
- 実行記録: `docs/notes/x402-03-run.md`

## 起動

```bash
git clone https://github.com/suzukitech/agent-payments-lab.git
cd agent-payments-lab
git config core.hooksPath .githooks   # gitleaks pre-commit（要 brew install gitleaks）
pnpm install                          # Node 22+
pnpm gen-wallets                      # 売り手・買い手のテスト用ウォレットを生成し .env に保存（アドレスのみ表示）
pnpm dev
curl -i http://localhost:3000/api/free
curl -i http://localhost:3000/api/weather     # 402 + PAYMENT-REQUIRED
```

支払いまで試すには買い手アドレスに Base Sepolia の USDC（テスト用）のみを入れ、`cd apps/paid-api && pnpm pay`。ETH は不要（実測: 買い手 ETH 0 で支払い成功）。`jq` が必要（`brew install jq`）。

faucet は2経路: [Circle](https://faucet.circle.com)（1回 20 USDC、同じネットワークと資産の組で 2 時間に 1 回）と [CDP Faucet](https://docs.cdp.coinbase.com/faucets/introduction/welcome)（USDC は1回 1、24 時間に 10 回まで。要ログイン）。

## .env

`.env.example` を参照。`PAY_TO_ADDRESS`（受取側、公開可）と `BUYER_PRIVATE_KEY`（支払い側、秘密）の2つ。`.env` は gitignore 済み。買い手キーは連載専用のテスト用ウォレットだけに使うこと。
