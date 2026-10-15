import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const facilitator = new HTTPFacilitatorClient({
  url: "https://x402.org/facilitator",
});

export const server = new x402ResourceServer(facilitator)
  .register("eip155:84532", new ExactEvmScheme());
