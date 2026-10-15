import { createPublicClient, http, erc20Abi, formatUnits } from "viem";
import { baseSepolia } from "viem/chains";
const c = createPublicClient({ chain: baseSepolia, transport: http() });
const usdc = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
for (const a of process.argv.slice(2) as `0x${string}`[]) {
  const [eth, u] = await Promise.all([c.getBalance({ address: a }), c.readContract({ address: usdc, abi: erc20Abi, functionName: "balanceOf", args: [a] })]);
  console.log(a, "ETH", formatUnits(eth, 18), "USDC", formatUnits(u, 6));
}
