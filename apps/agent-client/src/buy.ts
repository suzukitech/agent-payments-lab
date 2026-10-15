// Usage: pnpm buy <url> [--max-per-call <usd>] [--max-total <usd>]
import { x402Client, wrapFetchWithPayment, decodePaymentResponseHeader } from "@x402/fetch";
import { decodePaymentRequiredHeader, decodePaymentSignatureHeader } from "@x402/core/http";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name: string, def: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const url = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
if (!url) {
  console.error("usage: pnpm buy <url> [--max-per-call <usd>] [--max-total <usd>]");
  process.exit(2);
}
const maxPerCall = opt("--max-per-call", "0.01");
const maxTotalAtomic = BigInt(Math.round(Number(opt("--max-total", "0.05")) * 1e6)); // USDC: 6 decimals

// Cumulative spend lives in a file so it survives across runs (the SDK has no cumulative cap).
const SPEND_FILE = new URL("../.x402-spend.json", import.meta.url);
const readSpent = (): bigint => {
  try { return BigInt(JSON.parse(readFileSync(SPEND_FILE, "utf8")).spentAtomic); } catch { return 0n; }
};
const usdc = (atomic: string | bigint) => (Number(atomic) / 1e6).toFixed(6);

const account = privateKeyToAccount(process.env.BUYER_PRIVATE_KEY as `0x${string}`);

const client = new x402Client()
  .register("eip155:84532", new ExactEvmScheme(account))
  // SDK default is "$1" per payment even if you set nothing. Set it explicitly and lower.
  .setSpendControls({ maxAmountPerPayment: `$${maxPerCall}` })
  .onBeforePaymentCreation(async ({ selectedRequirements }) => {
    const spent = readSpent();
    const amount = BigInt(selectedRequirements.amount);
    if (spent + amount > maxTotalAtomic) {
      return { abort: true, reason: `max-total ${usdc(maxTotalAtomic)} USDC would be exceeded (spent ${usdc(spent)} + ${usdc(amount)})` };
    }
  })
  // Count at signing time, not at 200: a signed authorization stays spendable by anyone
  // until validBefore, so signing is the worst-case commitment. Over-counts on 5xx; fine for a cap.
  .onAfterPaymentCreation(async ({ selectedRequirements }) => {
    writeFileSync(SPEND_FILE, JSON.stringify({ spentAtomic: (readSpent() + BigInt(selectedRequirements.amount)).toString() }) + "\n");
  });

// Spy on the inner fetch: shows exactly what goes on the wire.
const spy: typeof fetch = async (input, init) => {
  const req = input instanceof Request ? input : new Request(input, init);
  const sig = req.headers.get("PAYMENT-SIGNATURE");
  if (sig) {
    const p = decodePaymentSignatureHeader(sig);
    console.log("-> request with PAYMENT-SIGNATURE:");
    console.log(JSON.stringify(p, null, 1));
    const a = (p.payload as any).authorization;
    if (a) console.log(`   authorization: ${usdc(a.value)} USDC ${a.from} -> ${a.to}, validBefore ${new Date(Number(a.validBefore) * 1000).toISOString()}`);
  } else console.log(`-> ${req.method} ${req.url}`);
  const res = await fetch(req);
  console.log(`<- ${res.status}  payment headers: ${[...res.headers.keys()].filter((k) => k.includes("payment")).join(", ") || "(none)"}`);
  const pr = res.status === 402 && res.headers.get("PAYMENT-REQUIRED");
  if (pr) {
    const d = decodePaymentRequiredHeader(pr);
    console.log(`   error: ${d.error}`);
    console.log(`   accepts: ${JSON.stringify(d.accepts)}`);
  }
  return res;
};

console.log(`buyer: ${account.address}  max-per-call: $${maxPerCall}  max-total: ${usdc(maxTotalAtomic)} (spent so far: ${usdc(readSpent())})`);
try {
  const res = await wrapFetchWithPayment(spy, client)(url);
  console.log("status:", res.status);
  console.log("body:", await res.text());
  const h = res.headers.get("PAYMENT-RESPONSE");
  if (h) {
    const d = decodePaymentResponseHeader(h);
    console.log("payment-response:", JSON.stringify(d));
    console.log("basescan:", `https://sepolia.basescan.org/tx/${d.transaction}`);
  }
  process.exit(res.status === 200 ? 0 : 1);
} catch (e) {
  console.error("blocked:", e instanceof Error ? e.message : e);
  process.exit(2);
}
