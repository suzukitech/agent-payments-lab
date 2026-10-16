// Smoke test: spawn wallet-mcp over stdio and call the tools named in argv (default: both).
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const c = new Client({ name: "probe", version: "0" });
await c.connect(new StdioClientTransport({ command: "./node_modules/.bin/tsx", args: ["src/server.ts"], env: { ...(process.env as Record<string, string>) } }));
console.log("tools:", (await c.listTools()).tools.map((t) => t.name).join(", "));
for (const name of process.argv.slice(2).length ? process.argv.slice(2) : ["get_weather", "get_weather_via_mcp"]) {
  console.log(name, "->", JSON.stringify(await c.callTool({ name, arguments: {} })));
}
await c.close();
