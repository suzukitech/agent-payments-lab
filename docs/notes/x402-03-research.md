# x402 連載 第3回（x402 × MCP）事実調査

確認日: 2026-10-16（以下すべての「確認日」はこの日付）
調査範囲: 事実のみ。解釈・設計判断は含まない。推測は「推測」と明記。
既存コードの現状（読んだだけ・変更なし）:

- `apps/agent-client/src/buy.ts`: `x402Client().register("eip155:84532", new ExactEvmScheme(account)).setSpendControls({ maxAmountPerPayment: "$<maxPerCall>" }).onBeforePaymentCreation(...).onAfterPaymentCreation(...)` を `wrapFetchWithPayment(spy, client)` に渡す形。累計は `.x402-spend.json` に保存。
- `apps/agent-client/package.json`: `@x402/core` / `@x402/evm` / `@x402/fetch` すべて 2.28.0、`viem` 2.57.7、`tsx` 4.20.0。
- `apps/paid-api/package.json`: `@x402/next` 2.28.0、`next` 16.4.1、`react` 19.2.0 ほか。
- ルート `package.json`: pnpm 12.11.2、`engines.node >=22`。
- （参考）ワークスペースの `node_modules/.pnpm` には `zod@3.22.4` / `zod@3.25.76` / `zod@4.6.7` が存在。

---

## 1. x402 v2 の MCP 対応

### 1.1 結論サマリ

- 公式に `@x402/mcp` パッケージがある（最新 2.28.0、公開 2026-09-29）。サーバー側は `createPaymentWrapper`、クライアント側は `createx402MCPClient` / `wrapMCPClientWithPayment` / `wrapMCPClientWithPaymentFromConfig` / `x402MCPClient`。
- MCP トランスポート仕様 `specs/transports-v2/mcp.md` が存在する（`http.md`、`a2a.md` と並ぶ）。
- examples に MCP サンプルがある（`servers/mcp`、`clients/mcp`、`clients/mcp-chatbot`）。
- 公式外では Vercel の `x402-mcp`（v1 系、0.1.1、2025-09-24 が最終公開）と Cloudflare Agents SDK の `agents/x402`（v2、`@x402/core` / `@x402/evm` を使用）がある。
- Claude Code / Claude Desktop のような標準 MCP クライアントは、x402 の `_meta["x402/payment"]` を送る機能を自前では持たない（Claude Code 公式ドキュメント全体に x402 の記述が無い。下記 1.7）。公式ガイドが示す解は「stdio の MCP サーバーを橋渡し（bridge）として立て、その中で x402 クライアントが支払う」構成。

### 1.2 npm 上の版と公開日（`npm view`、確認日 2026-10-16）

| パッケージ | latest | 公開日（latest） | 備考 |
|---|---|---|---|
| `@x402/mcp` | 2.28.0 | 2026-09-29T19:14:44Z | dist-tags に `alpha: 2.3.0-alpha` もある。2.27.0 = 2026-09-22、2.26.0 = 2026-09-15 |
| `@x402/core` | 2.28.0 | 2026-09-29（modified 19:03Z） | |
| `@x402/fetch` | 2.28.0 | 2026-09-29 | |
| `@x402/evm` | 2.28.0 | - | exports に `./exact/client` `./exact/server` `./upto/*` `./batch-settlement/*` など |
| `@modelcontextprotocol/sdk`（v1 系） | 1.32.1 | 2026-10-05T11:47:50Z | |
| `@modelcontextprotocol/server`（v2 系） | 2.3.1 | 2026-10-05T11:52:39Z | |
| `@modelcontextprotocol/client`（v2 系） | 2.3.1 | 2026-10-05 | |
| `x402-mcp`（Vercel/ethanniser） | 0.1.1 | 2025-09-24T00:15Z | 0.1.0 = 2025-09-23 |
| `agents`（Cloudflare） | 0.28.1 | 2026-10-13 modified | `agents/x402` を export |
| `zod` | 4.6.7 | 2026-10-12 modified | |

`@x402/mcp@2.28.0` の依存（`npm view @x402/mcp@2.28.0 dependencies`）:

```json
{ "zod": "^3.24.2", "@x402/core": "~2.28.0", "@modelcontextprotocol/sdk": "^1.12.1" }
```

つまり `@x402/mcp` は v1 系 SDK（`@modelcontextprotocol/sdk`）前提。v2 系（`@modelcontextprotocol/server`）には依存していない。

### 1.3 仕様: `specs/transports-v2/mcp.md`

出典: https://github.com/x402-foundation/x402/blob/main/specs/transports-v2/mcp.md （main の commit `faa1c694`、2026-10-15 時点を clone して確認）

要点（原文抜粋）:

```
## Payment Flow Overview

1. Client calls a paid tool without payment
2. Server returns a tool result with `isError: true` and `PaymentRequired` data
3. Client extracts payment requirements and creates a `PaymentPayload`
4. Client retries the tool call with payment in `_meta["x402/payment"]`
5. Server verifies payment, executes tool, settles payment
6. Server returns tool result with settlement info in `_meta["x402/payment-response"]`
```

```
When a tool requires payment, servers MUST return a tool result with `isError: true` containing the `PaymentRequired` data.
...
1. `structuredContent` (REQUIRED): Direct `PaymentRequired` object
2. `content[0].text` (REQUIRED): JSON-encoded string of the same `PaymentRequired` object
```

支払い要求のレスポンス例（仕様の原文）:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "isError": true,
    "structuredContent": {
      "x402Version": 2,
      "error": "Payment required to access this resource",
      "resource": {
        "url": "mcp://tool/financial_analysis",
        "description": "Advanced financial analysis tool",
        "mimeType": "application/json"
      },
      "accepts": [
        {
          "scheme": "exact",
          "network": "eip155:84532",
          "amount": "10000",
          "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
          "payTo": "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
          "maxTimeoutSeconds": 60,
          "extra": { "name": "USDC", "version": "2" }
        }
      ]
    },
    "content": [ { "type": "text", "text": "{\"x402Version\":2,\"error\":\"Payment required ...\"}" } ]
  }
}
```

支払い付きの再呼び出し（原文。`params._meta["x402/payment"]` に `PaymentPayload` を入れる）:

```json
{
  "jsonrpc": "2.0", "id": 1, "method": "tools/call",
  "params": {
    "name": "financial_analysis",
    "arguments": { "ticker": "AAPL", "analysis_type": "deep" },
    "_meta": {
      "x402/payment": {
        "x402Version": 2,
        "resource": { "url": "mcp://tool/financial_analysis", "description": "...", "mimeType": "application/json" },
        "accepted": { "scheme": "exact", "network": "eip155:84532", "amount": "10000", "asset": "0x036C...CF7e", "payTo": "0x2096...287C", "maxTimeoutSeconds": 60, "extra": { "name": "USDC", "version": "2" } },
        "payload": { "signature": "0x...", "authorization": { "from": "0x...", "to": "0x...", "value": "10000", "validAfter": "...", "validBefore": "...", "nonce": "0x..." } }
      }
    }
  }
}
```

決済結果（成功）は `result._meta["x402/payment-response"]` に `{ success, transaction, network, payer }`:

```json
"_meta": { "x402/payment-response": { "success": true, "transaction": "0x1234...", "network": "eip155:84532", "payer": "0x857b..." } }
```

決済失敗時の原文: "When payment settlement fails, servers return a tool result with `isError: true`. ... If settlement fails after the tool has already executed, the server should not return the tool's content - only the payment error."

エラー表（原文）:

| Error Type | Response | Description |
|---|---|---|
| Payment Required | Tool result with `isError: true` | No payment provided, returns `PaymentRequired` |
| Payment Invalid | Tool result with `isError: true` | Payment verification failed, returns `PaymentRequired` with reason |
| Settlement Failed | Tool result with `isError: true` | Settlement failed after execution, returns failure details |

仕様末尾の References に Cloudflare の実装が載っている: `[agents/x402-mcp](https://github.com/cloudflare/agents/blob/main/packages/agents/src/mcp/x402.ts)`（このパスは現在 404。実体は `packages/agents/src/mcp/client/x402.ts`、下記 1.6）。

注意点（`typescript/packages/mcp/README.md` より）: MCP TypeScript SDK v1 は `McpError` を `isError: true` のツール結果に変換して `error.data` を失う。そのため `@x402/mcp` は `isError: true` のツール結果で支払い要求を伝える。クライアントは JSON-RPC エラー（コード `-32042` / `402`）の形も受理する（"4 shapes across 2 response types"）。

### 1.4 `@x402/mcp` の API（README 原文に近い形）

出典: https://github.com/x402-foundation/x402/tree/main/typescript/packages/mcp （README.md）、https://www.npmjs.com/package/@x402/mcp

インストール（README）: `npm install @x402/mcp @x402/core @modelcontextprotocol/sdk`

エクスポートされる主な関数・クラス（ソース `src/client/x402MCPClient.ts`, `src/server/paymentWrapper.ts` で確認）:

- サーバー: `createPaymentWrapper(resourceServer, { accepts, resource?, hooks?, extensions? })`、`x402ResourceServer`（`@x402/mcp` から再エクスポート。README の import 例では `from "@x402/mcp"`）
- クライアント: `createx402MCPClient(config)`、`wrapMCPClientWithPayment(mcpClient, paymentClient, options)`、`wrapMCPClientWithPaymentFromConfig(mcpClient, config)`、`class x402MCPClient`

**サーバー側（ツールに価格を付ける）— README Quick Start 原文**

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createPaymentWrapper, x402ResourceServer } from "@x402/mcp";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { z } from "zod";

// Create standard MCP server
const mcpServer = new McpServer({ name: "premium-api", version: "1.0.0" });

// Set up x402 for payment handling
const facilitatorClient = new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" });
const resourceServer = new x402ResourceServer(facilitatorClient);
resourceServer.register("eip155:84532", new ExactEvmScheme());
await resourceServer.initialize();

// Build payment requirements
const accepts = await resourceServer.buildPaymentRequirements({
  scheme: "exact",
  network: "eip155:84532",
  payTo: "0x...", // Your wallet address
  price: "$0.10",
});

// Create payment wrapper with accepts array
const paid = createPaymentWrapper(resourceServer, { accepts });

// Register paid tools - wrap handler
mcpServer.tool(
  "financial_analysis",
  "Advanced AI-powered financial analysis. Costs $0.10.",
  { ticker: z.string() },
  paid(async (args) => {
    const analysis = await performAnalysis(args.ticker);
    return { content: [{ type: "text", text: analysis }] };
  })
);

// Register free tools - no wrapper needed
mcpServer.tool("ping", "Health check", {}, async () => ({
  content: [{ type: "text", text: "pong" }],
}));

await mcpServer.connect(transport);
```

examples の実コード（`examples/typescript/servers/mcp/simple.ts`）との差分: `buildPaymentRequirements` に `extra: { name: "USDC", version: "2" }`（EIP-712 ドメイン）を渡している。価格は `$0.001`。トランスポートは Express + `SSEServerTransport`（`/sse` と `/messages`）。環境変数は `EVM_ADDRESS` / `FACILITATOR_URL` / `PORT`（既定 4022）。

サーバー側フック（`PaymentWrapperConfig.hooks`）: `onBeforeExecution`（false を返すと実行中止・課金しない）、`onAfterExecution`、`onAfterSettlement`。`extensions`（Bazaar 発見用メタデータなど）、`resource`（`url` 既定は `mcp://tool/{toolName}`）も指定可。

**クライアント側（支払う）— README 原文**

```typescript
import { createx402MCPClient } from "@x402/mcp";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

const client = createx402MCPClient({
  name: "my-agent",
  version: "1.0.0",
  schemes: [{ network: "eip155:84532", client: new ExactEvmScheme(walletAccount) }],
  autoPayment: true,
  onPaymentRequested: async ({ paymentRequired }) => {
    console.log(`Tool requires payment: ${paymentRequired.accepts[0].amount}`);
    return true; // Return false to deny payment
  },
});

const transport = new SSEClientTransport(new URL("http://localhost:4022/sse"));
await client.connect(transport);

const result = await client.callTool("financial_analysis", { ticker: "AAPL" });
console.log(result.content);
if (result.paymentMade && result.paymentResponse) {
  console.log("Payment settled:", result.paymentResponse.transaction);
}
```

既存 `x402Client` を流用する版（README）:

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { wrapMCPClientWithPayment, wrapMCPClientWithPaymentFromConfig } from "@x402/mcp";
import { x402Client } from "@x402/core/client";
import { ExactEvmScheme } from "@x402/evm/exact/client";

const mcpClient = new Client({ name: "my-agent", version: "1.0.0" });
const paymentClient = new x402Client().register("eip155:84532", new ExactEvmScheme(walletAccount));
const x402Mcp = wrapMCPClientWithPayment(mcpClient, paymentClient, { autoPayment: true });
```

`x402MCPClient` は `get paymentClient(): x402Client` を公開している（ソース確認）。つまり `buy.ts` と同じ `setSpendControls` / `onBeforePaymentCreation` / `onAfterPaymentCreation` を、MCP クライアントに渡す `x402Client` に付けられる（`wrapMCPClientWithPayment` に自前の `x402Client` を渡す形。この組み合わせでの実動作は未検証＝推測を含む）。

`x402MCPClientConfig`（`createx402MCPClient` の引数、ソース `x402MCPClient.ts` L999- ）: `name`, `version`, `schemes[]`, `policies?`, `spendControls?: SpendControls | false`（コメント: "Forwarded to x402Client (default assets only + `$1` USD cap; `false` disables all)"）, `paymentRequirementsSelector?`（コメント: "Default (via x402Client) is server-ordered accepts[0] — prefer an explicit selector in production."）, `autoPayment?`（既定 true）, `onPaymentRequested?`, `mcpClientOptions?`。

クライアントのオプション表（README）:

| Option | Default | 説明 |
|---|---|---|
| `autoPayment` | `true` | 支払い要求で自動リトライ |
| `onPaymentRequested` | `() => true` | "Hook for human-in-the-loop approval when payment is requested" |
| `maxRequestTimeoutSeconds` | `600` | accept の `maxTimeoutSeconds` から導出する待ち時間の上限 |

クライアントフック（README）: `client.onPaymentRequired(...)`（`{ payment }` か `{ abort: true }` を返せる）、`client.onBeforePayment(...)`、`client.onAfterPayment(...)`。

`CHANGELOG.md`（2.26.0）: MCP のツール呼び出しタイムアウトは accept の `maxTimeoutSeconds`（無ければ 300 秒）から導出し、クライアント側上限 `maxRequestTimeoutSeconds`（既定 600 秒）で抑える。初回の 402 プローブは `min(300s, cap)`。

### 1.5 公式ガイド `docs.x402.org` の「MCP Server with x402」（橋渡し構成）

出典: https://docs.x402.org/guides/mcp-server-with-x402 （リポジトリ内 `docs/guides/mcp-server-with-x402.mdx`、main で確認。Web 版 .md は https://docs.x402.org/guides/mcp-server-with-x402.md）

これは `@x402/mcp` を使う構成とは別の、**Claude Desktop など既存の MCP クライアントから有料 HTTP API を叩くための stdio ブリッジ**の公式ガイド。原文の位置づけ:

> "The MCP server acts as a bridge between Claude Desktop (or any MCP-compatible client) and a paid API ... When Claude (or another agent) calls a tool, the MCP server will: 1. Detect if the API requires payment (via HTTP 402 with `PAYMENT-REQUIRED` header) 2. Automatically handle the payment using your wallet via the registered x402 scheme 3. Return the paid data to the client (e.g., Claude)"

Claude Desktop 側の設定（原文）:

```json
{
  "mcpServers": {
    "demo": {
      "command": "pnpm",
      "args": ["--silent", "-C", "<absolute path to this repo>/examples/typescript/clients/mcp", "dev"],
      "env": {
        "EVM_PRIVATE_KEY": "<private key of a wallet with USDC on Base Sepolia>",
        "SVM_PRIVATE_KEY": "<base58-encoded private key of a Solana wallet with USDC on Devnet>",
        "RESOURCE_SERVER_URL": "http://localhost:4021",
        "ENDPOINT_PATH": "/weather"
      }
    }
  }
}
```

実装（原文の要点。`@x402/axios` を使い、stdio の `McpServer` にツールを1つ生やす）:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import axios from "axios";
import { x402Client, wrapAxiosWithPayment } from "@x402/axios";
import { ExactEvmScheme } from "@x402/evm/exact/client";
// ... (Solana / batch-settlement の import は省略)

const client = new x402Client();
client.register("eip155:*", new ExactEvmScheme(privateKeyToAccount(evmPrivateKey)));
const api = wrapAxiosWithPayment(axios.create({ baseURL }), client);

const server = new McpServer({ name: "x402 MCP Client Demo", version: "2.0.0" });
server.tool(
  "get-data-from-resource-server",
  "Get data from the resource server (in this example, the weather)",
  {},
  async () => {
    const res = await api.get(endpointPath);
    return { content: [{ type: "text", text: JSON.stringify(res.data) }] };
  },
);
const transport = new StdioServerTransport();
await server.connect(transport);
```

同ガイドの支払い前チェックの節（原文引用）:

> "This example auto-approves payments for local testing. In production, the MCP bridge should check the payment requirements before creating or signing a payment payload. The client hooks are the right place to enforce those rules."
> At minimum, compare the selected requirement against your expected tool call: maximum amount and currency / expected `network` and `scheme` / expected resource server or facilitator / tool name and user-requested operation / per-user, per-agent, or per-session spend limits

> "By default the underlying `x402Client` only allows recognized default assets and applies a **$1 USD spend cap** unless you override `spendControls` (raise/disable `maxAmountPerPayment`, opt into other tokens via `allowedAssets`, or set `spendControls: false`)"

> "If a payment requirement does not match the intended tool call, deny it before the wallet signs. Avoid relying only on model prompts for spend controls; keep the policy check in code near the payment client."

`policies` の例（原文）: `policies: [(_version, reqs) => reqs.filter(r => BigInt(r.amount ?? "0") < 1_000_000n)]`、`onPaymentRequested` の例は `toolName !== "get_weather"` / `network !== "eip155:84532"` / `BigInt(requirement.amount) > 1_000n` なら false を返す。

Bazaar 連携: MCP サーバー側で `createPaymentWrapper(..., { extensions: declareDiscoveryExtension({ toolName, description, transport: "sse", inputSchema, example }) })` を渡すと、支払い時にファシリテーターが `/discovery/resources` に `type: "mcp"` で索引する（同ガイド末尾）。

### 1.6 公式外の実装

**Vercel `x402-mcp`（npm、リポジトリ ethanniser/x402-mcp）**

- 出典: https://www.npmjs.com/package/x402-mcp 、ホームページ https://vercel.com/blog/introducing-x402-mcp-open-protocol-payments-for-mcp-tools
- 版 0.1.1、最終公開 2025-09-24。`npm view x402-mcp` の依存: `"x402": "^0.5.3"`, `"@modelcontextprotocol/sdk": "^1.17.5"`, `"mcp-handler": "^1.0.2"`, `"zod": "^3`、peer に `viem >=2.37.0`, `ai >=5.0.0`。
- v1/v2 の別: 依存が旧 `x402` パッケージ（`@x402/*` ではない）なので **v1 系と推測**（ソース内の `x402Version` は未確認）。公式 v2 の `@x402/*` には依存していない（事実）。
- API（README 原文）: サーバー `createPaidMcpHandler((server) => { server.paidTool("get_random_number", "...", { price: 0.001 }, { min: z.number().int(), max: z.number().int() }, {}, async (args) => ...) }, { recipient: process.env.WALLET_ADDRESS })`。クライアント `withPayment(client, { account: process.env.PRIVATE_KEY })`（Vercel AI SDK の `experimental_createMCPClient` 向け）。例のシステムプロンプト: `"ALWAYS prompt the user to confirm before authorizing payments"`。

**Cloudflare Agents SDK（`agents` パッケージの `agents/x402`）**

- 出典（ドキュメント）: https://developers.cloudflare.com/agents/tools/payments/x402/ 、同 `charge-for-mcp-tools`、`pay-from-agents-sdk`、`pay-with-tool-plugins`（ソース: https://github.com/cloudflare/cloudflare-docs/tree/production/src/content/docs/agents/tools/payments/x402 ）
- 実装: https://github.com/cloudflare/agents/blob/main/packages/agents/src/mcp/client/x402.ts 。ファイル冒頭コメント "X402 MCP Integration (v2)"、`@x402/core` / `@x402/evm` を import（`x402ResourceServer`, `HTTPFacilitatorClient`, `x402Client`, `registerExactEvmScheme`）。`agents@0.28.1` の依存に `@x402/core ^2.0.0`, `@x402/evm ^2.0.0`, `@modelcontextprotocol/sdk 1.32.1`, `@modelcontextprotocol/server 2.3.1`, `@modelcontextprotocol/client 2.3.1`, `zod ^4.0.0`。**v2**（事実）。旧 v1 ネットワーク名（`base-sepolia`, `base`）を CAIP-2 に変換する互換マップを持つ。
- サーバー（原文）: `withX402(new McpServer(...), { network: "base", recipient: "0x...", facilitator: { url: "https://x402.org/facilitator" } })` の後 `this.server.paidTool("square", "Squares a number", 0.01 /* USD */, { number: z.number() }, {}, async ({ number }) => ...)`。`paidTool` の署名: `name, description, price(USD), inputSchema(Zod), annotations, handler`。
- クライアント（原文）: `withX402Client(this.mcp.mcpConnections[id].client, { network: "base-sepolia", account })`、`this.x402Client.callTool(this.onPaymentRequired, { name, arguments })`。"The first parameter is the confirmation callback. Set to `null` for the agent to pay automatically."
- 「Claude Code から支払う」例（Cloudflare docs `pay-with-tool-plugins`）: Claude Code の **PostToolUse フック**で `WebFetch` の結果に "402" が含まれたら、フック内スクリプト（`@x402/fetch` の `wrapFetchWithPayment`、`X402_PRIVATE_KEY` 環境変数）で支払って `additionalContext` として返す。MCP ではなく HTTP/WebFetch の話。原文: "Claude Code hooks intercept tool results. To handle 402s transparently, create a script at `.claude/scripts/handle-x402.mjs`" 、設定は `"hooks": { "PostToolUse": [ { "matcher": "WebFetch", "hooks": [ { "type": "command", "command": "node .claude/scripts/handle-x402.mjs", "timeout": 30 } ] } ] }`。コード内のコメント: `// Your human-in-the-loop confirmation flow...`（確認は未実装のプレースホルダ）。

**その他（未検証・検索結果の要約のみ）**: Web 検索（確認日 2026-10-16、1回）では、Claude Code 向けをうたう第三者の x402 stdio ブリッジが複数ヒットした（Civic `x402-mcp`、HPP `x402-mcp-bridge`、`true402` の mcp-server、`x402node/x402-mcp`、`x402-market` など）。コードは未確認・保守状況不明。一次情報として使う場合は各リポジトリを個別に確認すること。Coinbase 側にも https://docs.cdp.coinbase.com/x402/mcp-server というページがヒットしたが、中身は未確認。

### 1.7 標準 MCP クライアント（Claude Code / Claude Desktop）はそのまま支払えるか

事実:

- x402 の MCP 仕様では、支払い側が `tools/call` の `params._meta["x402/payment"]` に署名済み `PaymentPayload` を載せる必要がある（1.3）。
- Claude Code 公式ドキュメント（`code.claude.com/docs/en/{mcp,permissions,settings,sandboxing,security,sub-agents}` を全文取得して `x402` を検索）に x402 / `_meta` で支払う機能の記述は **見つからなかった**。`https://code.claude.com/docs/llms.txt` の目次にも x402 の項目は無かった。
- Claude Code が MCP ツールの結果をどう扱うか: 「`isError: true` を返すと、Claude は結果のテキストをツールのエラーメッセージとして受け取る」（`mcp.md`「MCP output limits and warnings」節の原文: "**Error results**: when a tool returns a result marked `isError: true`, Claude receives the result's text as the tool's error message."）。
- 公式 x402 ガイドは、Claude Desktop に対して「stdio の MCP サーバーを自分で立て、サーバー内部の x402 クライアントが HTTP API に支払う」構成を案内している（1.5）。クライアント（Claude）側に x402 は要らない。

推測（要検証）: 有料 `@x402/mcp` サーバーを Claude Code に直接 `claude mcp add` で繋いだ場合、Claude Code は `_meta["x402/payment"]` を付けられないため、有料ツールは常に `isError: true` + PaymentRequired を返すだけになり、支払いは成立しない。この挙動は実機で確認していない。

クライアント側に必要なもの（事実として確認できる範囲）:

1. `@x402/mcp` のクライアント（`createx402MCPClient` など）を使うプログラム、または
2. 公式ガイド型の stdio ブリッジ（MCP サーバー自身が `x402Client` を持ち、内部で有料 HTTP / 有料 MCP を呼ぶ）。

どちらも署名鍵（`EVM_PRIVATE_KEY` など）を MCP サーバープロセス側に環境変数で渡す設計（公式ガイドの `claude_desktop_config` の `env` に秘密鍵を直書きしている）。

---

## 2. MCP TypeScript SDK

### 2.1 版とパッケージ（確認日 2026-10-16）

出典: `npm view`、https://github.com/modelcontextprotocol/typescript-sdk （main README）

- **v1 系 `@modelcontextprotocol/sdk` 最新 1.32.1、公開 2026-10-05T11:47:50Z**（1.32.0 = 2026-10-02、1.31.0 = 2026-09-28）。
- **v2 系 `@modelcontextprotocol/server` / `@modelcontextprotocol/client` 最新 2.3.1、公開 2026-10-05**（2.3.0 = 2026-10-02、2.2.0 = 2026-09-28）。
- main README の原文（IMPORTANT ブロック）: "**This is the `main` branch: v2 of the SDK** (`@modelcontextprotocol/server`, `@modelcontextprotocol/client`), the stable release line, implementing the [2026-07-28 MCP spec]. ... **v1.x** (`@modelcontextprotocol/sdk`) lives on the `v1.x` branch and continues to receive bug fixes and security updates for at least six months after the v2 release (2026-07-27)."
- v1.x README の原文（WebFetch で取得）: 2026-07-28 spec のサポートは v1.x では計画されておらず、v2 側で提供される。
- Claude Code 側のクライアント実装: `code.claude.com/docs/en/mcp`「MCP client runtimes」節の原文: "The v1 runtime is built on MCP TypeScript SDK 1.x. The v2 runtime is the same code on MCP TypeScript SDK 2.0, which adds MCP protocol revision 2026-07-28." Claude Code v2.1.274 以降は一部条件で既定が v2、`MCP_SDK_GENERATION` を `v1` / `v2` にして選べる。手元の Claude Code は `2.1.301`（`claude --version`）。

### 2.2 zod の要否と版

- v1 系: `npm install @modelcontextprotocol/sdk zod`。v1.x README 原文: "This SDK has a **required peer dependency** on `zod` for schema validation." `npm view @modelcontextprotocol/sdk@1.32.1 peerDependencies` = `{ "zod": "^3.25 || ^4.0", "@cfworker/json-schema": "^4.1.1" }`。README: zod v3.25 以降をサポートし、`zod/v3` または `zod/v4` を import できる。
- v2 系: 原文「Tool and prompt schemas use [Standard Schema] — bring Zod v4, Valibot, ArkType, or any compatible library.」。最小例は `import * as z from 'zod/v4';` で `inputSchema: z.object({ name: z.string() })`（v1 は `inputSchema: { weightKg: z.number() }` のような「Zod の生シェイプ」形式も使える）。
- `@x402/mcp@2.28.0` 自身は `zod ^3.24.2`、`@modelcontextprotocol/sdk ^1.12.1` に依存。

### 2.3 stdio サーバーの最小コード

**v1 系（`@modelcontextprotocol/sdk` 1.32.1）** — `docs/server.md`（v1.x ブランチ）の stdio 節の原文:

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({ name: 'my-server', version: '1.0.0' });
// ... register tools, resources, prompts ...

const transport = new StdioServerTransport();
await server.connect(transport);
```

ツール登録は `registerTool`（v1.x の docs/server.md 原文）:

```typescript
server.registerTool(
    'calculate-bmi',
    {
        title: 'BMI Calculator',
        description: 'Calculate Body Mass Index',
        inputSchema: { weightKg: z.number(), heightM: z.number() },
        outputSchema: { bmi: z.number() }
    },
    async ({ weightKg, heightM }) => {
        const output = { bmi: weightKg / (heightM * heightM) };
        return { content: [{ type: 'text', text: JSON.stringify(output) }], structuredContent: output };
    }
);
```

`tool()` と `registerTool()`: v1.x の `src/server/mcp.ts` で `tool(...)` の各オーバーロードに `@deprecated Use \`registerTool\` instead.` が付いている（`curl` で確認、確認日 2026-10-16）。ただし `@x402/mcp` の README / examples と公式ガイドは今も `mcpServer.tool(...)` を使っている（動く。deprecated 注記のみ）。

**v2 系（`@modelcontextprotocol/server` 2.3.1）** — main README の最小例（原文）:

```typescript
import { McpServer } from '@modelcontextprotocol/server';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import * as z from 'zod/v4';

const server = new McpServer({ name: 'greeting-server', version: '1.0.0' });

server.registerTool(
    'greet',
    { description: 'Greet someone by name', inputSchema: z.object({ name: z.string() }) },
    async ({ name }) => ({ content: [{ type: 'text', text: `Hello, ${name}!` }] })
);

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main();
```

stdio の注意（v2 `docs/get-started/first-server.md` 原文）: "stdout is the protocol channel. Log with `console.error` — one `console.log` corrupts the JSON-RPC stream."（v2 docs は `serveStdio(createServer)` も紹介。）

### 2.4 ツールがエラーを返す正しい方法

出典: https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/servers/errors.md （v2）、https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/docs/server.md （v1、「Error handling」節）

v1.x docs 原文: "To indicate that a tool call failed, set `isError: true` in the result. The content describes what went wrong:"

```typescript
server.registerTool('risky-operation', { description: 'An operation that might fail' }, async () => {
    try {
        const result = await doSomething();
        return { content: [{ type: 'text', text: result }] };
    } catch (err) {
        return { content: [{ type: 'text', text: `Error: ${err.message}` }], isError: true };
    }
});
```

v2 docs 原文: "A **tool error** is a successful JSON-RPC result with `isError: true` that the model reads and recovers from. A **protocol error** is a JSON-RPC error response the model never sees." 「Return `isError: true` from a tool handler to report a failure the model should see.」また "Throw instead: the SDK catches anything a tool handler throws and converts it to the same `isError: true` shape."「Put the recovery hint in `text` — it is the only thing the model has to work with.」入力がスキーマ違反の場合もハンドラは走らず `isError: true` の結果になる（tools.md）。

Claude Code 側（`mcp.md`）: `isError: true` の結果はテキストがそのままエラーメッセージとして Claude に渡る。約 11,000 文字を超えるエラーテキストは先頭 5,000 と末尾 5,000 文字だけ残り、間に削除文字数のマーカーが入る。

---

## 3. Claude Code へのローカル MCP 登録

出典: https://code.claude.com/docs/en/mcp （docs.anthropic.com/en/docs/claude-code/mcp はここへ移動。`curl https://code.claude.com/docs/en/mcp.md` で全文を取得して確認、確認日 2026-10-16、手元の Claude Code は 2.1.301）

### 3.1 `claude mcp add` の構文（stdio）

原文:

```bash
# Basic syntax
claude mcp add [options] <name> -- <command> [args...]

# Real example: Add Airtable server
claude mcp add --env AIRTABLE_API_KEY=YOUR_KEY --transport stdio airtable \
  -- npx -y airtable-mcp-server
```

> "For stdio servers, the `--` (double dash) separates Claude's own options, such as `--transport`, `--env`, and `--scope`, from the command and arguments that run the server. Everything after `--` is passed to the server untouched."
> "`--env` accepts multiple `KEY=value` pairs. If the server name comes directly after `--env`, the CLI reads the name as another pair and rejects it, so place at least one other option, such as `--transport stdio`, between `--env` and the server name."

`claude mcp add --help`（実機 2.1.301）の抜粋: `-e, --env <env...>`、`-s, --scope <scope>  Configuration scope (local, user, or project) (default: "local")`、`-t, --transport <transport>  Transport type (stdio, sse, http). Defaults to stdio if not specified.`

管理コマンド: `claude mcp list` / `claude mcp get <name>` / `claude mcp remove <name>` / セッション内 `/mcp`。JSON で追加: `claude mcp add-json <name> '<json>'`（`--scope` 可）。

Claude Code は stdio サーバー起動時に環境変数 `CLAUDE_PROJECT_DIR`（プロジェクトルート）を渡す。`.mcp.json` の `command` / `args` で参照するときは `${CLAUDE_PROJECT_DIR:-.}` のようにデフォルトが必要（原文）。

stdio サーバーの停止（原文）: macOS/Linux は `SIGINT` → 100ms 後 `SIGTERM` → さらに 400ms 後 `SIGKILL`。

### 3.2 スコープと保存先（原文の表）

| Scope | Loads in | Shared with team | Stored in |
|---|---|---|---|
| Local | Current project only | No | `~/.claude.json` |
| Project | Current project only | Yes, via version control | `.mcp.json` in project root |
| User | All your projects | No | `~/.claude.json` |

- 既定は local（`-s` / `--scope` で `local` / `project` / `user`）。local は `~/.claude.json` の `projects["<プロジェクトの絶対パス>"].mcpServers` に保存される（原文の JSON 例あり）。注意書き: MCP の local スコープは `~/.claude.json`、一般設定の local は `.claude/settings.local.json` で別物。
- 優先順位（同名のとき）: Local > Project > User > プラグイン提供 > claude.ai コネクタ。エントリ全体が採用され、フィールドはマージされない。
- project スコープ: 対話セッションでは `.mcp.json` のサーバー使用前に承認プロンプトが出る。`claude -p`・Agent SDK・クラウドセッションではプロンプトが出せず、**承認なしで読み込まれる**（原文）。除外手段: `disabledMcpjsonServers`、`--setting-sources`、`--strict-mcp-config`。`claude mcp reset-project-choices` で承認をリセット。

### 3.3 `.mcp.json` の形式と環境変数

原文（HTTP 例）:

```json
{ "mcpServers": { "shared-server": { "type": "http", "url": "https://example.com/mcp" } } }
```

stdio は `type` を省略するか `"stdio"`、`command` / `args` / `env` を書く（`mcpServers` JSON ブロックの節: "Claude Code reads an entry with no `type` as a stdio server"。例: `{"command":"npx","args":["-y","@example/mcp-server"]}`）。

環境変数展開（原文）: `${VAR}` / `${VAR:-default}`。展開できる場所: `command` / `args` / `env` / `url` / `headers`。未設定でデフォルトも無い場合は、警告を出して `${VAR}` の文字列のまま使う。リモートサーバーの `url` / `headers` では `ANTHROPIC_API_KEY` など認証情報系の変数は空として読まれる（stdio の `env` は対象外の記述）。`claude mcp list` / `get` と `/mcp` は `${VAR}` を展開後の値でなく参照名のまま表示する。

その他:
- サーバーごとのツール実行タイムアウト: `.mcp.json` エントリの `timeout`（ミリ秒、1000 未満は無視）。未設定時は `MCP_TOOL_TIMEOUT`、さらに未設定なら約 28 時間。起動タイムアウトは `MCP_TIMEOUT`。
- 出力上限: 既定 25,000 トークン（`MAX_MCP_OUTPUT_TOKENS`）、成功した text 結果は 50,000 文字超でファイル保存。
- メインの会話で 2 分を超える MCP ツール呼び出しは自動でバックグラウンドタスク化（v2.1.212 以降）。**サブエージェントからの呼び出しはバックグラウンド化されない**（原文）。
- ツール側から「毎回ユーザー承認を必須にする」宣言: ツールの `tools/list` エントリに `_meta["anthropic/requiresUserInteraction"] = true`（JSON の真偽値 true のみ有効）。`dontAsk` モードでは、この印の付いた MCP ツールは allow ルールがあっても拒否される（`sub-agents.md` の permissionMode 表の原文）。

### 3.4 サブエージェント（Agent ツール）から MCP ツールを使えるか

出典: https://code.claude.com/docs/en/sub-agents

原文:

> "Subagents inherit the built-in tools and MCP tools available in the main conversation, narrowed by two filters: the first removes a short list of tools from every subagent, and the second reduces the built-in tool set for subagents that run in the background, which is the default."
> "a background subagent keeps every MCP tool but only these built-in tools: `Read`, `Grep`, `Glob`, `LSP`, `Bash`, `PowerShell`, `Edit`, `Write`, `NotebookEdit`, `WebFetch`, `WebSearch`, `TodoWrite`, `Skill`, `ToolSearch`, ..."

- したがって、**サブエージェントは既定でメイン会話の MCP ツールを継承して使える**（バックグラウンドでも MCP ツールは全部残る）。除外されるツール（第1フィルタ）の一覧に `WaitForMcpServers` が含まれる。
- 制限方法: frontmatter の `tools`（許可リスト）/ `disallowedTools`（拒否リスト）。原文: "Both fields accept MCP server-level patterns in addition to exact tool names: `mcp__<server>` or `mcp__<server>__*` grants or removes every tool from the named server. In `disallowedTools`, `mcp__*` also removes every MCP tool from any server." 例: `disallowedTools: mcp__github`。
- `tools` を Read, Grep, Glob, Bash だけにした例の説明（原文）: "The subagent can't edit files, write files, or use any MCP tools"。
- サブエージェント専用の MCP サーバー: frontmatter の `mcpServers`（既存サーバー名の文字列参照か、`.mcp.json` と同じスキーマの inline 定義）。inline 定義はサブエージェント開始時に接続、終了時に切断。プロジェクトの `.claude/agents/` にある定義の inline サーバーは、そのフォルダを信頼するまで読み込まれない。プラグイン提供のサブエージェントでは `mcpServers` / `hooks` / `permissionMode` は無視される。
- 権限規則での MCP ツール名: `mcp__<server>` / `mcp__<server>__*` / `mcp__<server>__<tool>`（`permissions.md` 原文）。

---

## 4. permissions.deny の効き方（最重要）

出典（すべて 2026-10-16 に `curl` で全文取得）:
- https://code.claude.com/docs/en/permissions
- https://code.claude.com/docs/en/settings-reference （`permissions.deny` の節）
- https://code.claude.com/docs/en/sandboxing
- https://code.claude.com/docs/en/security
- https://code.claude.com/docs/en/permission-modes

### 4.1 評価順序

原文（permissions.md「Manage permissions」）:

> "Rules are evaluated in order: deny, then ask, then allow. The first match in that order determines the outcome, and rule specificity doesn't change the order."
> "A broad deny rule like `Bash(aws *)` blocks every matching call, including calls that also match a narrower allow rule like `Bash(aws s3 ls)`. An allow rule can't carve an exception out of a deny rule."
> "Permission rules are enforced by Claude Code, not by the model. Instructions in your prompt or `CLAUDE.md` shape what Claude tries to do, but they don't change what Claude Code allows."

スコープ間: "If user settings allow a permission and project settings deny it, the deny rule blocks it. The reverse is also true: a user-level deny blocks a project-level allow, because deny rules from any scope are evaluated before allow rules."（Settings precedence 節）

素のツール名の deny の効き（原文）: "A bare tool name like `Bash` removes the tool from Claude's context entirely, so Claude never sees it. ... A scoped rule like `Bash(rm *)` leaves the tool available and blocks matching calls when Claude attempts them."

`permissions.deny` 本体（settings-reference.md）原文:

> "List the tool uses Claude Code blocks. Use it for files that hold API keys, secrets, or environment values: Claude Code excludes matching files from file discovery and search results, denies reads of them, and blocks the Edit and Write tools on the matching paths."

例（原文）:

```json
{
  "permissions": {
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Read(./config/credentials.json)",
      "Bash(curl *)"
    ]
  }
}
```

### 4.2 Read / Edit / Write の deny が止めるもの

原文（permissions.md「Read and Edit」）:

> "`Edit` rules apply to all built-in tools that edit files. Claude makes a best-effort attempt to apply `Read` rules to all built-in tools that read files like Grep and Glob, to `@file` mentions in your prompts, and to the selection and open-file context that a connected IDE shares with Claude."
> "A `Read` deny rule also blocks the Edit and Write tools on the same path, including creating a new file there. NotebookEdit isn't covered, so add an `Edit` deny rule for paths no tool may change."
> "Claude Code checks file permissions against `Edit(path)` and `Read(path)` rules only. If you write a path rule for `Write`, `NotebookEdit`, `Glob`, or the legacy `MultiEdit` tool instead, Claude Code accepts the rule but never consults it, and warns at startup ... Use `Edit(docs/**)` in place of `Write(docs/**)` ..."

つまり **パス付きの `Write(...)` ルールは効かない（`Edit(...)` を使う）。** パス無しの `Write` は（ツール全体として）効く。`.claudeignore` は無効（"has no effect"、`Read` deny に移す）。

Read deny はペーストした画像パスやディレクトリの @メンション一覧にも効く（v2.1.290 以降）。

### 4.3 Bash 経由（cat / python -c / node -e）で読み書きされた場合 ← 最重要

原文（permissions.md の Warning ブロック。settings-reference.md の `permissions.deny` にも同旨）:

> "Read and Edit deny rules apply to Claude's built-in file tools, to file commands Claude Code recognizes in Bash, such as `cat`, `head`, `tail`, `sed`, and `tee`, and to the targets of Bash redirections such as `> file` and `< file`. They don't apply to a command that reads files without naming them, such as `grep -r pattern .` run from the directory that holds the file, or to arbitrary subprocesses that read or write files indirectly, like a Python or Node script that opens files itself. For OS-level enforcement that blocks all processes from accessing a path, enable the sandbox."

整理（原文からの事実のみ）:

| 経路 | Read/Edit deny が効くか（原文ベース） |
|---|---|
| Read / Edit / Write / Grep / Glob 等の組み込みツール | 効く（Grep・Glob の Read は "best-effort"） |
| Bash の `cat` / `head` / `tail` / `sed` / `tee` にパスを書く | 効く（"file commands Claude Code recognizes in Bash"） |
| Bash のリダイレクト `> file` / `>> file` / `2> file` / `< file` | 効く（redirections 節: 出力は `Edit` allow/deny、入力は `Read` allow/deny を照合。`~` で始まる、または glob を含む出力先は承認が必要） |
| `grep -r pattern .`（ファイル名を書かずに読む） | 効かない |
| `python -c` / `node -e` / スクリプト内の `open()` など任意サブプロセス | **効かない**（"arbitrary subprocesses ... like a Python or Node script that opens files itself"） |

出典の明記: 上記の「`python -c` / `node -e`」は原文の "a Python or Node script that opens files itself" に対応する解釈。`node -e` という文字列そのものは原文に無い。

OS レベルで止めるにはサンドボックス（4.5）。

### 4.4 パス指定の書式（Read / Edit ルール）

Read/Edit は gitignore 構文。原文の表:

| Pattern | Meaning | Example | Matches |
|---|---|---|---|
| `//path` | Absolute path from filesystem root | `Read(//Users/alice/secrets/**)` | `/Users/alice/secrets/**` |
| `~/path` | Path from home directory | `Read(~/Documents/*.pdf)` | `/Users/alice/Documents/*.pdf` |
| `/path` | Path relative to the settings source | `Edit(/src/**/*.ts)` | `<primary working directory>/src/**/*.ts` in project settings |
| `path` or `./path` | Path relative to current directory | `Read(*.env)` | `<cwd>/*.env` |

> "A pattern like `/Users/alice/file` isn't an absolute path. The single leading slash anchors at the settings source, not the filesystem root. Use `//Users/alice/file` for absolute paths."

`/path` の基準（原文の表）: `.claude/settings.json` と `.claude/settings.local.json` では `<primary working directory>/path`、**ユーザー設定 `~/.claude/settings.json` では `~/.claude/path`**、`--settings <file>` ではそのファイルのディレクトリ。原文: "A deny rule such as `Read(/secrets/**)` in user settings blocks `~/.claude/secrets/**`, not a `secrets` directory in your project. To write a rule in user settings that applies inside every project, use a `//` absolute path or a `~/` home-relative path instead."

その他の要点（原文）:
- 例: `Read(~/.zshrc)`、`Edit(//tmp/scratch.txt)`、`Edit(/docs/**)`。
- 裸のファイル名は gitignore 同様どの深さでも一致: `Read(.env)` と `Read(**/.env)` は同等。`Read(//**/.env)` は FS 上のすべての `.env`。
- 単一セグメントのディレクトリ指定（`src/**`）は、**allow では `<cwd>/src` のみ、deny/ask では任意の深さの `src`** に一致。
- `*` は1セグメント内、`**` はディレクトリ横断。deny/ask の先頭 `!` は否定（同じ設定ファイル内の先に書いた `path` / `./path` 規則からだけ除外できる）。
- シンボリックリンク: deny は「要求パス」か「解決後パス」のどちらかが一致すれば効く。allow は両方一致が必要。
- Windows は POSIX 形式に正規化（`//c/**/.env`）。

### 4.5 Bash(...) ルールの照合方式と迂回

**照合方式（原文）**: 「Bash rules match the whole command text, with `*` standing in for any text.」`*` は空白を含む任意のテキスト。`*` なしのルールは完全一致。

> "Claude Code matches everything before the first `*` as written, so those words are what limit the rule: `Bash(git log *)` allows only `git log` commands, and `Bash(git *)` allows every git command."

要点:
- `Bash(ls *)` は `ls` 単体にも `ls -la` にも一致し `lsof` には一致しない（空白が規則の一部）。`Bash(ls*)` は `lsof` にも一致。`Bash(ls:*)` は `Bash(ls *)` と同じ（`:*` は末尾のみ有効）。
- 複合コマンド: 区切り `&&`, `||`, `;`, `|`, `|&`, `&`, 改行を認識し、**各サブコマンドが独立にルールに一致する必要がある**。deny/ask は「どれかのサブコマンドが一致」で適用され、サブシェル・コマンド置換・`for` 本体内も対象。
- ラッパー除去: 固定リスト `timeout`, `time`, `nice`, `nohup`, `stdbuf`、シェル組み込み `command`, `builtin`、zsh の `noglob`、フラグ無しの `xargs`。既知の安全な環境変数代入も除去。**deny/ask は任意の先頭環境変数代入を飛ばして一致する**（`Bash(rm *)` は `FOO=bar rm -rf tmp/` に一致）。`npx` / `docker exec` / `devbox run` などはリスト外で、`Bash(devbox run *)` は `devbox run rm -rf .` にも一致してしまう。
- `find -exec/-delete` や `watch` などの実行ラッパーは prefix ルールで自動承認できない。

**迂回されうるもの（原文「What a Bash rule doesn't match」）**:

> "A Bash rule matches the command text Claude writes, after Claude Code splits compound commands and strips wrappers. It doesn't match the same program invoked in a different form, so a deny or ask rule covers the invocation Claude usually produces and isn't a security boundary around the program."

| Rule | Stops | Doesn't stop |
|---|---|---|
| `Bash(curl *)` | `curl https://example.com` | `/usr/bin/curl https://example.com`, `sh -c 'curl https://example.com'` |
| `Bash(rm *)` | `rm -rf build/` | `/bin/rm -rf build/`, `bash -c 'rm -rf build/'` |
| `Bash(git push *)` | `git push origin main` | `git -C . push origin main`, `git -c push.default=current push origin main`, `git 'push' origin main` |

> "For filesystem and network enforcement that doesn't depend on the command text, use sandboxing. To inspect the full command text with your own logic before it runs, use a PreToolUse hook."

引数を制限するパターンについての Warning（原文）: "Bash permission patterns that try to constrain command arguments are fragile." （`curl http://github.com/ *` が `curl -X GET http://...`、別プロトコル、リダイレクト、変数経由に一致しない例を列挙。）

組み込みの読み取り専用コマンド（`ls`, `cat`, `echo`, `head`, `tail`, `grep`, `find`, `wc`, `diff`, `stat` ほか）はプロンプト無しで実行される。この集合は設定不可で、止めたければ ask / deny を書く。

MCP ツールの deny（原文）: `"deny": ["mcp__*"]` で全 MCP ツール。`mcp__puppeteer` / `mcp__puppeteer__*` / `mcp__puppeteer__puppeteer_navigate`。deny/ask はツール名に glob が使える。allow の glob は `mcp__<server>__` の後ろにのみ許可。「括弧付きの `mcp__` ルールは設定ファイル読み込み時にスキップされる」（MCP ツールの入力パラメータ照合は `--disallowedTools` でのみ可）。

### 4.6 サンドボックス（OS レベルのファイル・ネットワーク制限）

出典: https://code.claude.com/docs/en/sandboxing

存在する。原文の要約:

> "The Bash sandbox is a boundary that the operating system enforces around the shell commands Claude runs on your machine. ... the limits apply to Bash, PowerShell, and Monitor commands and the processes they start."
> "The sandbox covers shell commands only. Claude's file tools, MCP servers, and hooks run outside it."

- macOS は Seatbelt、Linux / WSL2 は bubblewrap（Linux は `bubblewrap` と `socat` が必要）。ネイティブ Windows は非対応（コマンドは無サンドボックスで実行）。**既定で無効**（"The sandbox is off by default"）。ベース実装は OSS の `@anthropic-ai/sandbox-runtime`。
- 有効化: セッション内 `/sandbox`、または `settings.json` の `sandbox.enabled: true`。1セッションだけなら `claude --settings '{"sandbox": {"enabled": true, "allowUnsandboxedCommands": false}}'`。
- 既定の範囲（原文の表）: 書き込み = 作業ディレクトリ・ユーザー別 temp・`--add-dir` 等で足したディレクトリ（保護パスは書込不可）。**読み取り = マシンの大半（`~/.ssh` や `~/.aws/credentials` 等の認証情報ファイルを含む）**。ネットワーク = 直接の経路なし、ローカルのプロキシが `network.allowedDomains`（空から開始）で判定。環境変数 = Claude Code から継承（秘密を含む）。
- 設定キー: `sandbox.filesystem.allowWrite` / `denyWrite` / `denyRead` / `allowRead`、`sandbox.network.allowedDomains` / `deniedDomains`、`sandbox.credentials`（`files` と `envVars`、`mode: "deny"` または `"mask"`）、`allowUnsandboxedCommands`、`failIfUnavailable`、`excludedCommands`。

設定例（原文）:

```json
{ "sandbox": { "enabled": true, "filesystem": { "denyRead": ["~/"], "allowRead": ["."] } } }
```

```json
{
  "sandbox": {
    "enabled": true,
    "credentials": {
      "files": [ { "path": "~/.aws/credentials", "mode": "deny" }, { "path": "~/.ssh", "mode": "deny" } ],
      "envVars": [ { "name": "GITHUB_TOKEN", "mode": "deny" }, { "name": "NPM_TOKEN", "mode": "deny" } ]
    }
  }
}
```

- 注意: sandbox のファイルシステム設定のパス書式は `/tmp/build`（絶対）・`~/.kube`（ホーム相対）で、Read/Edit 権限ルールの `//path` / `/path` とは**書式が違う**（原文）。
- 原文: "There is no built-in credential deny list, so only the files and variables you list are restricted."
- サンドボックスと権限ルールはマージされる（"Paths and domains from both sandbox settings and permission rules are merged into the final sandbox configuration."）。`Read` deny / `Edit` ルールからサンドボックスの設定が組まれる。

**サンドボックスの外側で動くもの（原文）— MCP サーバーに直結する重要事項**:

> "The sandbox wraps shell commands. These tools and processes run outside it:
> * Built-in file and web tools: tools such as Read, Edit, Write, WebFetch, and WebSearch follow permission rules instead. A `denyRead` entry doesn't stop the Read tool, and `allowedDomains` doesn't limit WebFetch
> * Other processes Claude Code starts: command hooks, local MCP servers, plugin monitors, LSP servers, and helper commands such as your status line command and `apiKeyHelper` run with your full access"

- つまり **ローカル（stdio）MCP サーバーのプロセスはサンドボックス外・ユーザー権限で動く**。MCP サーバーが秘密鍵を環境変数で受け取る構成（公式ガイドの `env` 例）では、その鍵は Claude のサンドボックス化 Bash からは見えない設計にできるが、MCP サーバー自身は制限されない。
- 全体を囲うには: "run Claude Code (local mode) inside the sandbox runtime with a network allowlist limited to the hosts you approve, or in the dev container with its firewall script."（Scope 節）
- サンドボックスからの逃げ道: `dangerouslyDisableSandbox` による無サンドボックス再試行（既定で有効）。`"allowUnsandboxedCommands": false` で無効化できる（strict sandbox mode）。`bypassPermissions` モードでは再試行はプロンプト無しで実行。許可ルールに一致するコマンドは再試行も自動承認される。`Bash(dangerouslyDisableSandbox:true)` の ask ルールで毎回確認を強制できる。
- サンドボックスが起動できない場合（依存欠落など）の既定動作は「サンドボックス無しで実行」。`sandbox.failIfUnavailable: true` で起動を失敗させられる。
- 自分で打つ `!` 行は多くのセッションでサンドボックス外。
- 保護パス（サンドボックス内でも書込不可）: `.claude` の設定ファイル・`.claude/skills|agents|commands|hooks`・`.mcp.json`・`.bashrc`/`.zshrc`・`.gitconfig` など。理由（原文）: "A command that could edit those files could grant itself permissions, or add a hook or MCP server that Claude Code runs outside the sandbox."
- 限界（Limitations 節）: ネットワークは TLS 非検査でドメイン名ベース（domain fronting の可能性）、Unix ソケット許可は迂回経路になりうる、Linux の `enableWeakerNestedSandbox` は強度を大きく下げる。

### 4.7 権限とサンドボックスの関係（まとめ原文）

> "Permissions control which tools Claude Code can use and which files or domains it can access. They apply to Bash, Read, Edit, WebFetch, MCP, and every other tool ... Sandboxing provides OS-level enforcement that restricts shell commands' filesystem and network access."
> "Use both for defense-in-depth, since sandbox restrictions still apply even if a prompt injection bypasses Claude's decision-making."

サンドボックス有効かつ `autoAllowBashIfSandboxed`（既定 true）の場合、サンドボックス内の Bash は素の `Bash` ask ルールがあってもプロンプト無しで実行される。ただし明示的な deny ルールと、内容付きの ask ルール（`Bash(git push *)` など）は引き続き効く。

### 4.8 security ページ・その他

- `security.md`「MCP security」原文: "We encourage either writing your own MCP servers or using MCP servers from providers that you trust. ... Anthropic ... does not security-audit or manage any MCP server."
- `security.md`: curl / wget は既定で自動承認されない。止めるには `permissions.deny`、ネットワークの強制はサンドボックスのネットワーク分離、と明記。
- 追加の確認手段としてフック: PreToolUse フックでコマンド全文を検査できる（permissions.md「Extend permissions with hooks」節。上記 4.5 の原文から参照）。
- 管理者向け: managed settings の deny は他のスコープ・`--allowedTools` で上書き不可。`allowManagedPermissionRulesOnly` あり。

---

## 5. 見つからなかったもの / 未確認

- Claude Code / Claude Desktop が `_meta["x402/payment"]` を自動で付与する機能: 見つからなかった（Claude Code docs 6 ページ全文＋llms.txt を `x402` で検索、ヒットなし。Claude Desktop 側のドキュメントは未調査）。
- Vercel `x402-mcp` が `x402Version: 1` を使うことの直接確認（ソースコード未読）。依存パッケージからの推測のみ。
- Vercel ブログ記事の本文（https://vercel.com/blog/introducing-x402-mcp-open-protocol-payments-for-mcp-tools）: 取得していない。
- Cloudflare の `examples/x402-mcp`（https://github.com/cloudflare/agents/tree/main/examples/x402-mcp）の中身: 未読。
- `wrapMCPClientWithPayment` に `buy.ts` と同じ `setSpendControls` / `onBeforePaymentCreation` を付けた `x402Client` を渡したときの実動作: コード上は `paymentClient` を受け取るので可能と読めるが、実行検証はしていない（推測）。
- 第三者の x402 stdio ブリッジ群のコード・保守状況: 未検証（Web 検索1回の要約のみ）。
- 本ファイル以外のリポジトリ（`agent-payments-lab`）は一切変更していない。調査用の clone / 取得物は scratchpad（`/private/tmp/claude-501/-Users-suzukiyasuhiro-workspaces-suzukitech/f9a6ceb0-428d-4f92-8ced-e4b3ec3495d3/scratchpad/`）に置いた。

## 6. 主要な出典 URL 一覧（確認日 2026-10-16）

- x402 MCP 仕様: https://github.com/x402-foundation/x402/blob/main/specs/transports-v2/mcp.md
- `@x402/mcp` ソース/README: https://github.com/x402-foundation/x402/tree/main/typescript/packages/mcp
- `@x402/mcp` npm: https://www.npmjs.com/package/@x402/mcp
- examples（サーバー）: https://github.com/x402-foundation/x402/tree/main/examples/typescript/servers/mcp
- examples（クライアント）: https://github.com/x402-foundation/x402/tree/main/examples/typescript/clients/mcp 、https://github.com/x402-foundation/x402/tree/main/examples/typescript/clients/mcp-chatbot
- 公式ガイド（MCP Server with x402）: https://docs.x402.org/guides/mcp-server-with-x402
- Vercel x402-mcp: https://www.npmjs.com/package/x402-mcp
- Cloudflare docs: https://developers.cloudflare.com/agents/tools/payments/x402/
- Cloudflare 実装: https://github.com/cloudflare/agents/blob/main/packages/agents/src/mcp/client/x402.ts
- MCP TypeScript SDK: https://github.com/modelcontextprotocol/typescript-sdk （main = v2、`v1.x` ブランチ = v1）、v2 docs https://ts.sdk.modelcontextprotocol.io/v2/
- Claude Code: https://code.claude.com/docs/en/mcp 、/permissions 、/settings-reference 、/sandboxing 、/security 、/sub-agents 、/permission-modes
