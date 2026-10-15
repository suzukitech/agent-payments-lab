import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(process.env.BUYER_PRIVATE_KEY as `0x${string}`);
console.log("buyer:", account.address);

const fetchWithPayment = wrapFetchWithPaymentFromConfig(fetch, {
  schemes: [{ network: "eip155:84532", client: new ExactEvmScheme(account) }],
});

const res = await fetchWithPayment(process.env.API_URL ?? "http://localhost:3000/api/weather");
console.log("status:", res.status);
console.log("body:", await res.json());
const pr = res.headers.get("PAYMENT-REQUIRED");
if (pr) console.log("payment-required.error:", JSON.parse(Buffer.from(pr, "base64").toString()).error);
const h = res.headers.get("PAYMENT-RESPONSE");
if (h) {
  const d = decodePaymentResponseHeader(h);
  console.log("payment-response:", d);
  console.log("basescan:", `https://sepolia.basescan.org/tx/${d.transaction}`);
}
