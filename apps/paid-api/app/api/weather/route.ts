import { NextRequest, NextResponse } from "next/server";
import { withX402 } from "@x402/next";
import { server } from "@/lib/x402";

const handler = async (_: NextRequest) =>
  NextResponse.json({ report: { weather: "sunny", temperature: 70 } });

export const GET = withX402(
  handler,
  {
    accepts: [
      {
        scheme: "exact",
        price: "$0.01",
        network: "eip155:84532",
        payTo: process.env.PAY_TO_ADDRESS as `0x${string}`,
      },
    ],
    description: "Weather data",
  },
  server,
);
