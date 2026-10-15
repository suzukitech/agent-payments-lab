# agent-payments-lab

連載「AIエージェントに財布を持たせる」のコード置き場。**テストネット（Base Sepolia）のみ。本番資産・実貨幣は一切使わない。**

| 回 | タグ | 内容 |
|---|---|---|
| 1 | `x402-01` | Next.js で x402 の有料 API を作り、402 を受け取る（`apps/paid-api`） |

## 第1回: HTTP 402 を Next.js で動かす

- `GET /api/free` は 200、`GET /api/weather` は `withX402` で保護（$0.01、`eip155:84532`）
- ファシリテーターは `https://x402.org/facilitator`（テストネット用）
- 支払いクライアントの最小例は `apps/paid-api/scripts/pay.ts`（第2回の前振り）
- シーケンス図: `docs/diagrams/x402-01-sequence.mmd`、実行記録: `docs/notes/`

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

支払いまで試すには買い手アドレスに Base Sepolia の ETH と USDC（テスト用）を入れ、`cd apps/paid-api && pnpm pay`。

## .env

`.env.example` を参照。`PAY_TO_ADDRESS`（受取側、公開可）と `BUYER_PRIVATE_KEY`（支払い側、秘密）の2つ。`.env` は gitignore 済み。買い手キーは連載専用のテスト用ウォレットだけに使うこと。
