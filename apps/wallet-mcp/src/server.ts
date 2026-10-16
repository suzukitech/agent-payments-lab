// Wallet MCP server (stdio). The only process that holds the buyer key, the limits and the cumulative ledger.
// Never console.log here: stdout is the JSON-RPC channel. Log to stderr.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { x402Client, wrapFetchWithPayment, decodePaymentResponseHeader } from "@x402/fetch";
import { wrapMCPClientWithPayment } from "@x402/mcp";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync, mkdirSync, chmodSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// State lives outside the repo: ~/.agent-payments-lab/{wallet.env,config.json,spend.json}
const HOME = process.env.WALLET_HOME ?? join(homedir(), ".agent-payments-lab");
const WEATHER_URL = process.env.PAID_API_URL ?? "https://paid-api-flax.vercel.app/api/weather";
const PAID_MCP_URL = process.env.PAID_MCP_URL ?? "http://localhost:3001/mcp";
const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

const key = readFileSync(join(HOME, "wallet.env"), "utf8").match(/^BUYER_PRIVATE_KEY=(.+)$/m)?.[1]?.trim();
if (!key) throw new Error(`BUYER_PRIVATE_KEY not found in ${HOME}/wallet.env`);
const config = JSON.parse(readFileSync(join(HOME, "config.json"), "utf8")) as { maxPerCall: string; maxTotal: string };
const maxTotalAtomic = BigInt(Math.round(Number(config.maxTotal) * 1e6)); // USDC: 6 decimals

const SPEND_FILE = join(HOME, "spend.json");
const readSpent = (): bigint => {
  try { return BigInt(JSON.parse(readFileSync(SPEND_FILE, "utf8")).spentAtomic); } catch { return 0n; }
};
const usdc = (atomic: string | bigint) => (Number(atomic) / 1e6).toFixed(6);
if (!existsSync(SPEND_FILE)) writeFileSync(SPEND_FILE, '{"spentAtomic":"0"}\n', { mode: 0o600 });
chmodSync(SPEND_FILE, 0o600);

const account = privateKeyToAccount(key as `0x${string}`);

// Limit logic copied from apps/agent-client/src/buy.ts (round 2). One x402Client is shared by both tools,
// so (a) MCP and (b) HTTP go through the same checks and the same ledger.
// Check + reservation happen in one synchronous block of onBeforePaymentCreation (no await between reading and writing
// spend.json), so concurrent tool calls on this event loop cannot interleave there. The reserved amount is rolled back if
// signing fails. ponytail: single process only; a second wallet-mcp on the same spend.json would need a file lock.
const writeSpent = (v: bigint) => writeFileSync(SPEND_FILE, JSON.stringify({ spentAtomic: v.toString() }) + "\n", { mode: 0o600 });
const payer = new x402Client()
  .register("eip155:84532", new ExactEvmScheme(account))
  .setSpendControls({ maxAmountPerPayment: `$${config.maxPerCall}` })
  .onBeforePaymentCreation(async ({ selectedRequirements }) => {
    if (selectedRequirements.asset.toLowerCase() !== USDC_BASE_SEPOLIA.toLowerCase()) {
      return { abort: true, reason: `max-total counts USDC (6 decimals) only; got asset ${selectedRequirements.asset}` };
    }
    const spent = readSpent();
    const amount = BigInt(selectedRequirements.amount);
    if (spent + amount > maxTotalAtomic) {
      return { abort: true, reason: `max-total ${usdc(maxTotalAtomic)} USDC would be exceeded (spent ${usdc(spent)} + ${usdc(amount)})` };
    }
    writeSpent(spent + amount); // reserve now (worst-case commitment, as in buy.ts)
  })
  // Signing failed after the reservation: give the reservation back. Not called when the check above aborts.
  .onPaymentCreationFailure(async ({ selectedRequirements }) => {
    writeSpent(readSpent() - BigInt(selectedRequirements.amount));
  });

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };
const ok = (o: object): ToolResult => ({ content: [{ type: "text", text: JSON.stringify(o) }] });
const fail = (msg: string): ToolResult => ({ content: [{ type: "text", text: msg }], isError: true });

// Wrap a purchase: report this call's cost and the cumulative total; any refusal becomes a tool error.
async function run(buy: () => Promise<{ result: unknown; tx?: string }>): Promise<ToolResult> {
  const before = readSpent();
  try {
    const { result, tx } = await buy();
    const after = readSpent();
    return ok({ result, tx, paidUsdc: usdc(after - before), totalSpentUsdc: usdc(after), maxTotalUsdc: usdc(maxTotalAtomic) });
  } catch (e) {
    console.error("purchase failed:", e);
    return fail(`not paid or failed: ${e instanceof Error ? e.message : String(e)} (spent so far ${usdc(readSpent())} of ${usdc(maxTotalAtomic)} USDC)`);
  }
}

const server = new McpServer({ name: "wallet-mcp", version: "0.1.0" });

// (b) bridge: buy the plain HTTP paid API with @x402/fetch
server.tool("get_weather", `Buy weather data from ${WEATHER_URL} via HTTP x402 (about $0.01 per call)`, {}, () =>
  run(async () => {
    const res = await wrapFetchWithPayment(fetch, payer)(WEATHER_URL);
    if (res.status !== 200) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const h = res.headers.get("PAYMENT-RESPONSE");
    return { result: await res.json(), tx: h ? decodePaymentResponseHeader(h).transaction : undefined };
  }));

// (a) the paid MCP tool, paid with @x402/mcp
server.tool("get_weather_via_mcp", `Buy weather data from the paid MCP server at ${PAID_MCP_URL} via x402 over MCP (about $0.01 per call)`, {}, () =>
  run(async () => {
    const mcp = new Client({ name: "wallet-mcp", version: "0.1.0" });
    const x402Mcp = wrapMCPClientWithPayment(mcp, payer, { autoPayment: true });
    await x402Mcp.connect(new StreamableHTTPClientTransport(new URL(PAID_MCP_URL)));
    try {
      const r = await x402Mcp.callTool("get_weather", {});
      if (r.isError) throw new Error(JSON.stringify(r.content).slice(0, 300));
      return { result: r.content, tx: r.paymentResponse?.transaction };
    } finally {
      await mcp.close();
    }
  }));

console.error(`wallet-mcp: buyer ${account.address}, home ${HOME}, max-per-call $${config.maxPerCall}, max-total ${usdc(maxTotalAtomic)}`);
await server.connect(new StdioServerTransport());
