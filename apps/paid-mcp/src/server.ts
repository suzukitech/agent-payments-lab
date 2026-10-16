// Paid MCP server (Streamable HTTP, stateless). get_weather costs $0.01 via @x402/mcp createPaymentWrapper.
import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createPaymentWrapper, x402ResourceServer } from "@x402/mcp";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const PORT = Number(process.env.PORT ?? 3001);
const resourceServer = new x402ResourceServer(new HTTPFacilitatorClient({ url: "https://x402.org/facilitator" }));
resourceServer.register("eip155:84532", new ExactEvmScheme());
await resourceServer.initialize();

const accepts = await resourceServer.buildPaymentRequirements({
  scheme: "exact",
  network: "eip155:84532",
  payTo: process.env.PAY_TO_ADDRESS as `0x${string}`,
  price: "$0.01",
});
const paid = createPaymentWrapper(resourceServer, { accepts });

function buildServer() {
  const s = new McpServer({ name: "paid-mcp", version: "0.1.0" });
  s.tool("get_weather", "Weather data. Costs $0.01 (x402, Base Sepolia).", {}, paid(async () => ({
    content: [{ type: "text", text: JSON.stringify({ report: { weather: "sunny", temperature: 70 } }) }],
  })));
  return s;
}

// Stateless: a fresh server + transport per POST. The transport reads the body itself: malformed JSON -> 400, over
// MAX_BODY -> 413, bad Host header -> 403 (DNS rebinding protection; the SDK marks these options deprecated in favour of
// external middleware, but they are still the least code for a loopback-only server).
const MAX_BODY = 64 * 1024;
createServer(async (req, res) => {
  if (req.url !== "/mcp" || req.method !== "POST") { res.writeHead(405).end(); return; }
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    maxRequestBodySize: MAX_BODY,
    enableDnsRebindingProtection: true,
    allowedHosts: [`127.0.0.1:${PORT}`, `localhost:${PORT}`],
  });
  const s = buildServer();
  res.on("close", () => { transport.close(); s.close(); });
  try {
    await s.connect(transport);
    await transport.handleRequest(req, res);
  } catch (e) {
    console.error("paid-mcp: request failed:", e);
    if (!res.headersSent) res.writeHead(400, { "content-type": "application/json" }).end('{"error":"bad request"}');
  }
}).listen(PORT, "127.0.0.1", () => console.error(`paid-mcp: http://127.0.0.1:${PORT}/mcp`));
