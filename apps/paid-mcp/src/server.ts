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

// Stateless: a fresh server + transport per POST.
createServer(async (req, res) => {
  if (req.url !== "/mcp" || req.method !== "POST") { res.writeHead(405).end(); return; }
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const s = buildServer();
  res.on("close", () => { transport.close(); s.close(); });
  await s.connect(transport);
  await transport.handleRequest(req, res, JSON.parse(Buffer.concat(chunks).toString()));
}).listen(PORT, "127.0.0.1", () => console.error(`paid-mcp: http://127.0.0.1:${PORT}/mcp`));
