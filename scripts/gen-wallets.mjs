// Generates a seller (receive) and buyer (pay) test wallet. Keys go to .env only; stdout shows addresses only.
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { existsSync, writeFileSync, symlinkSync } from "node:fs";

if (existsSync(".env")) { console.error(".env already exists; refusing to overwrite"); process.exit(1); }
const seller = privateKeyToAccount(generatePrivateKey());
const buyerKey = generatePrivateKey();
const buyer = privateKeyToAccount(buyerKey);
writeFileSync(".env", `PAY_TO_ADDRESS=${seller.address}\nBUYER_PRIVATE_KEY=${buyerKey}\n`, { mode: 0o600 });
// Next.js reads .env.local from apps/paid-api; point it at the root .env (both are gitignored)
if (!existsSync("apps/paid-api/.env.local")) symlinkSync("../../.env", "apps/paid-api/.env.local");
console.log("seller (PAY_TO_ADDRESS):", seller.address);
console.log("buyer:", buyer.address);
