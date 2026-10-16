// Concurrency check: spawn wallet-mcp and fire N parallel tool calls (argv[2] = tool, argv[3] = N, default get_weather x2).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const [name = "get_weather", n = "2"] = process.argv.slice(2);
const c = new Client({ name: "probe-par", version: "0" });
await c.connect(new StdioClientTransport({ command: "./node_modules/.bin/tsx", args: [process.env.WALLET_ENTRY ?? "src/server.ts"], env: { ...(process.env as Record<string, string>) } }));
const rs = await Promise.all(Array.from({ length: Number(n) }, () => c.callTool({ name, arguments: {} })));
rs.forEach((r, i) => console.log(`#${i + 1} ->`, JSON.stringify(r)));
await c.close();
