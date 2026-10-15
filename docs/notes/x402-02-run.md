# x402-02 run output (2026-10-15, local dev + Base Sepolia)

## a. weather (200 expected)
```
$ pnpm buy http://localhost:3000/api/weather
[balance before]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.99
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.01
[run]
$ pnpm --filter agent-client buy http://localhost:3000/api/weather
$ tsx --env-file=../../.env src/buy.ts http://localhost:3000/api/weather
buyer: 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673  max-per-call: $0.01  max-total: 0.050000 (spent so far: 0.000000)
-> GET http://localhost:3000/api/weather
<- 402
   error: Payment required
   accepts: [{"scheme":"exact","network":"eip155:84532","amount":"10000","asset":"0x036CbD53842c5426634e7929541eC2318f3dCF7e","payTo":"0x621279161e951eB55195FB872e46CE47C6925506","maxTimeoutSeconds":300,"extra":{"name":"USDC","version":"2"}}]
-> request with PAYMENT-SIGNATURE:
{
 "x402Version": 2,
 "payload": {
  "authorization": {
   "from": "0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673",
   "to": "0x621279161e951eB55195FB872e46CE47C6925506",
   "value": "10000",
   "validAfter": "0",
   "validBefore": "1792041493",
   "nonce": "0x56559f6ad8961fa41ab670693a183bf7c69d159164fb6eb2b4f491fb2f0b05a7"
  },
  "signature": "0x3561248ff0ccf37e254020982225c9b07f115c086c50ddfcd81738f6928afb4f4c584df7b9e5fee648372e1edb218d628746644892dacb9de1fddaeb1c7a2d4a1b"
 },
 "resource": {
  "url": "http://localhost:3000/api/weather",
  "description": "Weather data",
  "mimeType": ""
 },
 "accepted": {
  "scheme": "exact",
  "network": "eip155:84532",
  "amount": "10000",
  "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "payTo": "0x621279161e951eB55195FB872e46CE47C6925506",
  "maxTimeoutSeconds": 300,
  "extra": {
   "name": "USDC",
   "version": "2"
  }
 }
}
   authorization: 0.010000 USDC 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 -> 0x621279161e951eB55195FB872e46CE47C6925506, validBefore 2026-10-15T05:18:13.000Z
<- 200
status: 200
body: {"report":{"weather":"sunny","temperature":70}}
payment-response: {"success":true,"payer":"0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673","transaction":"0xe431e6cba5681db75c91c1155a4b6ddbee1e14f20b1367031660f713e3f4ba2f","network":"eip155:84532"}
basescan: https://sepolia.basescan.org/tx/0xe431e6cba5681db75c91c1155a4b6ddbee1e14f20b1367031660f713e3f4ba2f
exit code: 0
[balance after]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.99
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.01
```

## b. flaky (handler returns 500)
```
$ pnpm buy http://localhost:3000/api/flaky
[balance before]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.98
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.02
[run]
$ pnpm --filter agent-client buy http://localhost:3000/api/flaky
$ tsx --env-file=../../.env src/buy.ts http://localhost:3000/api/flaky
buyer: 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673  max-per-call: $0.01  max-total: 0.050000 (spent so far: 0.010000)
-> GET http://localhost:3000/api/flaky
<- 402
   error: Payment required
   accepts: [{"scheme":"exact","network":"eip155:84532","amount":"10000","asset":"0x036CbD53842c5426634e7929541eC2318f3dCF7e","payTo":"0x621279161e951eB55195FB872e46CE47C6925506","maxTimeoutSeconds":300,"extra":{"name":"USDC","version":"2"}}]
-> request with PAYMENT-SIGNATURE:
{
 "x402Version": 2,
 "payload": {
  "authorization": {
   "from": "0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673",
   "to": "0x621279161e951eB55195FB872e46CE47C6925506",
   "value": "10000",
   "validAfter": "0",
   "validBefore": "1792041497",
   "nonce": "0x2db29001da11bab76130410da9ef5f6c4bdee7ce0148409f154d45393271ed21"
  },
  "signature": "0x78a2e07c8e916fb1807476d28d07bdfc53b4ec37ae475202b72072d0c50ba4f12c075d594a49e6739a1faeb9d5c4f37005fc9df21a03cd4b8aaa6a5d8c3f01601c"
 },
 "resource": {
  "url": "http://localhost:3000/api/flaky",
  "description": "Always fails",
  "mimeType": ""
 },
 "accepted": {
  "scheme": "exact",
  "network": "eip155:84532",
  "amount": "10000",
  "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "payTo": "0x621279161e951eB55195FB872e46CE47C6925506",
  "maxTimeoutSeconds": 300,
  "extra": {
   "name": "USDC",
   "version": "2"
  }
 }
}
   authorization: 0.010000 USDC 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 -> 0x621279161e951eB55195FB872e46CE47C6925506, validBefore 2026-10-15T05:18:17.000Z
<- 500
status: 500
body: {"error":"boom"}
[ELIFECYCLE] Command failed with exit code 1.
Error: ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL

  × "pnpm recursive run" failed in /Users/suzukiyasuhiro/workspaces/agent-
  │ payments-lab/apps/agent-client

[ELIFECYCLE] Command failed with exit code 1.
exit code: 1
[balance after]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.98
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.02
```

## b'. throw (handler throws)
```
$ pnpm buy http://localhost:3000/api/throw
[balance before]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.98
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.02
[run]
$ pnpm --filter agent-client buy http://localhost:3000/api/throw
$ tsx --env-file=../../.env src/buy.ts http://localhost:3000/api/throw
buyer: 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673  max-per-call: $0.01  max-total: 0.050000 (spent so far: 0.020000)
-> GET http://localhost:3000/api/throw
<- 402
   error: Payment required
   accepts: [{"scheme":"exact","network":"eip155:84532","amount":"10000","asset":"0x036CbD53842c5426634e7929541eC2318f3dCF7e","payTo":"0x621279161e951eB55195FB872e46CE47C6925506","maxTimeoutSeconds":300,"extra":{"name":"USDC","version":"2"}}]
-> request with PAYMENT-SIGNATURE:
{
 "x402Version": 2,
 "payload": {
  "authorization": {
   "from": "0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673",
   "to": "0x621279161e951eB55195FB872e46CE47C6925506",
   "value": "10000",
   "validAfter": "0",
   "validBefore": "1792041500",
   "nonce": "0xab5fa8ee37a5bf429611154d4014c08d7b400affc8324db2c970eeada5ebef0b"
  },
  "signature": "0x789e6d22b0ec610b96930dd003dfe2ef33a1cefaadc0645fda50ab8fc784b213595dd954bf53aace4cc25de5d3ec0afa82dfadc298625dd0049653b27638b55d1b"
 },
 "resource": {
  "url": "http://localhost:3000/api/throw",
  "description": "Always throws",
  "mimeType": ""
 },
 "accepted": {
  "scheme": "exact",
  "network": "eip155:84532",
  "amount": "10000",
  "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "payTo": "0x621279161e951eB55195FB872e46CE47C6925506",
  "maxTimeoutSeconds": 300,
  "extra": {
   "name": "USDC",
   "version": "2"
  }
 }
}
   authorization: 0.010000 USDC 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 -> 0x621279161e951eB55195FB872e46CE47C6925506, validBefore 2026-10-15T05:18:20.000Z
<- 500
status: 500
body: 
[ELIFECYCLE] Command failed with exit code 1.
Error: ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL

  × "pnpm recursive run" failed in /Users/suzukiyasuhiro/workspaces/agent-
  │ payments-lab/apps/agent-client

[ELIFECYCLE] Command failed with exit code 1.
exit code: 1
[balance after]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.98
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.02
```

## c. --max-per-call 0.005
```
$ pnpm buy http://localhost:3000/api/weather --max-per-call 0.005
[balance before]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.98
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.02
[run]
$ pnpm --filter agent-client buy http://localhost:3000/api/weather --max-per-call 0.005
$ tsx --env-file=../../.env src/buy.ts http://localhost:3000/api/weather --max-per-call 0.005
buyer: 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673  max-per-call: $0.005  max-total: 0.050000 (spent so far: 0.030000)
-> GET http://localhost:3000/api/weather
<- 402
   error: Payment required
   accepts: [{"scheme":"exact","network":"eip155:84532","amount":"10000","asset":"0x036CbD53842c5426634e7929541eC2318f3dCF7e","payTo":"0x621279161e951eB55195FB872e46CE47C6925506","maxTimeoutSeconds":300,"extra":{"name":"USDC","version":"2"}}]
blocked: Failed to create payment payload: All payment requirements were rejected by spendControls.maxAmountPerPayment ($0.005, including USDC). Raise maxAmountPerPayment, set it to false to disable, set allowedAssets[].maxAmountPerPayment for a per-asset atomic cap, or set spendControls: false to disable all spend controls.
[ELIFECYCLE] Command failed with exit code 2.
Error: ERR_PNPM_RECURSIVE_RUN_FIRST_FAIL

  × "pnpm recursive run" failed in /Users/suzukiyasuhiro/workspaces/agent-
  │ payments-lab/apps/agent-client

[ELIFECYCLE] Command failed with exit code 1.
exit code: 1
[balance after]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.98
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.02
```

## b-2. flaky again, with response header names printed (same result expected)
```
$ pnpm buy http://localhost:3000/api/flaky
[balance before]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.98
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.02
[run]
$ pnpm --filter agent-client buy http://localhost:3000/api/flaky
$ tsx --env-file=../../.env src/buy.ts http://localhost:3000/api/flaky
buyer: 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673  max-per-call: $0.01  max-total: 0.050000 (spent so far: 0.000000)
-> GET http://localhost:3000/api/flaky
<- 402  payment headers: payment-required
   error: Payment required
   accepts: [{"scheme":"exact","network":"eip155:84532","amount":"10000","asset":"0x036CbD53842c5426634e7929541eC2318f3dCF7e","payTo":"0x621279161e951eB55195FB872e46CE47C6925506","maxTimeoutSeconds":300,"extra":{"name":"USDC","version":"2"}}]
-> request with PAYMENT-SIGNATURE:
{
 "x402Version": 2,
 "payload": {
  "authorization": {
   "from": "0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673",
   "to": "0x621279161e951eB55195FB872e46CE47C6925506",
   "value": "10000",
   "validAfter": "0",
   "validBefore": "1792041529",
   "nonce": "0x4e1cbabcc51b8d8104d9aad892b7deaff4f08433b03c8ef8c23367fd93651137"
  },
  "signature": "0xc96541e2d2fe394ed4ab98e4fcaf3208f751c5c88ca668bf81c188fd91b344447a1f85f8aa856daee4e71b4fa5568cac43bbec7f42a69f71d3c99b472491ff4d1b"
 },
 "resource": {
  "url": "http://localhost:3000/api/flaky",
  "description": "Always fails",
  "mimeType": ""
 },
 "accepted": {
  "scheme": "exact",
  "network": "eip155:84532",
  "amount": "10000",
  "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "payTo": "0x621279161e951eB55195FB872e46CE47C6925506",
  "maxTimeoutSeconds": 300,
  "extra": {
   "name": "USDC",
   "version": "2"
  }
 }
}
   authorization: 0.010000 USDC 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 -> 0x621279161e951eB55195FB872e46CE47C6925506, validBefore 2026-10-15T05:18:49.000Z
<- 500  payment headers: (none)
status: 500
body: {"error":"boom"}
exit code: 1
[balance after (+8s)]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.98
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.02
```

## b'-2. throw again, with response header names printed
```
$ pnpm buy http://localhost:3000/api/throw
[balance before]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.98
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.02
[run]
$ pnpm --filter agent-client buy http://localhost:3000/api/throw
$ tsx --env-file=../../.env src/buy.ts http://localhost:3000/api/throw
buyer: 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673  max-per-call: $0.01  max-total: 0.050000 (spent so far: 0.010000)
-> GET http://localhost:3000/api/throw
<- 402  payment headers: payment-required
   error: Payment required
   accepts: [{"scheme":"exact","network":"eip155:84532","amount":"10000","asset":"0x036CbD53842c5426634e7929541eC2318f3dCF7e","payTo":"0x621279161e951eB55195FB872e46CE47C6925506","maxTimeoutSeconds":300,"extra":{"name":"USDC","version":"2"}}]
-> request with PAYMENT-SIGNATURE:
{
 "x402Version": 2,
 "payload": {
  "authorization": {
   "from": "0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673",
   "to": "0x621279161e951eB55195FB872e46CE47C6925506",
   "value": "10000",
   "validAfter": "0",
   "validBefore": "1792041541",
   "nonce": "0x15f9cab00855c366e7766bc74ae1b527b94ac57b0ebc1d76909203d9b362ed69"
  },
  "signature": "0xabac061685c834500635600c52e06b14bae0eb0962136e89f85cd1a4bbe5b75461ab453640c67ef0e31c678f377bcb500a996a3fdb0ceb6e7ed03f57f665946f1c"
 },
 "resource": {
  "url": "http://localhost:3000/api/throw",
  "description": "Always throws",
  "mimeType": ""
 },
 "accepted": {
  "scheme": "exact",
  "network": "eip155:84532",
  "amount": "10000",
  "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  "payTo": "0x621279161e951eB55195FB872e46CE47C6925506",
  "maxTimeoutSeconds": 300,
  "extra": {
   "name": "USDC",
   "version": "2"
  }
 }
}
   authorization: 0.010000 USDC 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 -> 0x621279161e951eB55195FB872e46CE47C6925506, validBefore 2026-10-15T05:19:01.000Z
<- 500  payment headers: (none)
status: 500
body: 
exit code: 1
[balance after (+8s)]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.98
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.02
```

## d. --max-total 0.02, weather x3 (spend file reset to 0 beforehand)
```
[balance before]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.98
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.02

$ pnpm buy http://localhost:3000/api/weather --max-total 0.02   # run 1
$ pnpm --filter agent-client buy http://localhost:3000/api/weather --max-total 0.02
$ tsx --env-file=../../.env src/buy.ts http://localhost:3000/api/weather --max-total 0.02
buyer: 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673  max-per-call: $0.01  max-total: 0.020000 (spent so far: 0.000000)
-> GET http://localhost:3000/api/weather
<- 402  payment headers: payment-required
-> request with PAYMENT-SIGNATURE:
<- 200  payment headers: payment-response
status: 200
body: {"report":{"weather":"sunny","temperature":70}}
payment-response: {"success":true,"payer":"0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673","transaction":"0x57c7cc1582725c64f96ee8a90a81a6e22c2d178759aed74db79cb3edb4cc3f46","network":"eip155:84532"}
basescan: https://sepolia.basescan.org/tx/0x57c7cc1582725c64f96ee8a90a81a6e22c2d178759aed74db79cb3edb4cc3f46
exit code: 0

$ pnpm buy http://localhost:3000/api/weather --max-total 0.02   # run 2
$ pnpm --filter agent-client buy http://localhost:3000/api/weather --max-total 0.02
$ tsx --env-file=../../.env src/buy.ts http://localhost:3000/api/weather --max-total 0.02
buyer: 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673  max-per-call: $0.01  max-total: 0.020000 (spent so far: 0.010000)
-> GET http://localhost:3000/api/weather
<- 402  payment headers: payment-required
-> request with PAYMENT-SIGNATURE:
<- 200  payment headers: payment-response
status: 200
body: {"report":{"weather":"sunny","temperature":70}}
payment-response: {"success":true,"payer":"0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673","transaction":"0xb9a60d7420068a883defb1b7dc843433d17c0d554369283271a65f7ceb177528","network":"eip155:84532"}
basescan: https://sepolia.basescan.org/tx/0xb9a60d7420068a883defb1b7dc843433d17c0d554369283271a65f7ceb177528
exit code: 0

$ pnpm buy http://localhost:3000/api/weather --max-total 0.02   # run 3
$ pnpm --filter agent-client buy http://localhost:3000/api/weather --max-total 0.02
$ tsx --env-file=../../.env src/buy.ts http://localhost:3000/api/weather --max-total 0.02
buyer: 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673  max-per-call: $0.01  max-total: 0.020000 (spent so far: 0.020000)
-> GET http://localhost:3000/api/weather
<- 402  payment headers: payment-required
blocked: Failed to create payment payload: Payment creation aborted: max-total 0.020000 USDC would be exceeded (spent 0.020000 + 0.010000)
exit code: 1

[balance after (+8s)]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.96
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.04
spend file: {"spentAtomic":"20000"}
```

## e. (unplanned result) buy's settle failed on the facilitator; the SAME signature then succeeded when replayed with curl
```
$ pnpm buy http://localhost:3000/api/weather   # produces the signature (output trimmed to key lines)
<- 402  payment headers: payment-required
   "validBefore": "1792041580",
   "nonce": "0x84312782f921261287c3f89c3492b39c92d0cd22faa65b38c6ecf0a2fdc2c980"
   authorization: 0.010000 USDC 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 -> 0x621279161e951eB55195FB872e46CE47C6925506, validBefore 2026-10-15T05:19:40.000Z
<- 402  payment headers: payment-response
status: 402
payment-response: {"success":false,"errorReason":"invalid_exact_evm_transaction_failed","errorMessage":"Missing or invalid parameters.\nDouble check you have provided the correct parameters.\n\nURL: https://sepolia.base.org\nRequest body: {\"method\":\"eth_sendRawTransaction\",\"params\":[\"0x02f9019583014a34832bc87c830f4240836acfc08301527b94036cbd53842c5426634e7929541ec2318f3dcf7e80b90124e3ee160e00000000000000000000000062f9eca8cc6332972705e7d5bedc9f776cfdf673000000000000000000000000621279161e951eb55195fb872e46ce47c692550600000000000000000000000000000000000000000000000000000000000027100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006ad0626c84312782f921261287c3f89c3492b39c92d0cd22faa65b38c6ecf0a2fdc2c980000000000000000000000000000000000000000000000000000000000000001cfda25812151107aa106e71635c4a1c596b335d7b05e27f0090659eae46623ddb7d1d65bded41c04327f289a9f00cc495a4293ac3b0a55b71cafab7072fa108e5c080a0703e7ca3caf21a7cf642583250a10c5b43faa412114b4e9cad8a062f36753296a007106ab9164b2c63d3b68c6e8e4bf59128d2d1e08026991126ac91d25c2f3eb3\"]}\n \nRequest Arguments:\n  from:  0xd407e409E34E0b9afb99EcCeb609bDbcD5e7f1bf\n  to:    0x036CbD53842c5426634e7929541eC2318f3dCF7e\n  data:  0xe3ee160e00000000000000000000000062f9eca8cc6332972705e7d5bedc9f776cfdf673000000000000000000000000621279161e951eb55195fb872e46ce47c692550600000000000000000000000000000000000000000000000000000000000027100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006ad0626c84312782f921261287c3f89c3492b39c92d0cd22faa65b38c6ecf0a2fdc2c980000000000000000000000000000000000000000000000000000000000000001cfda25812151107aa106e71635c4a1c596b335d7b05e27f0090659eae46623ddb7d1d65bded41c04327f289a9f00cc495a4293ac3b0a55b71cafab7072fa108e5\n \nContract Call:\n  address:   0x036CbD53842c5426634e7929541eC2318f3dCF7e\n  function:  transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)\n  args:                               (0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673, 0x621279161e951eB55195FB872e46CE47C6925506, 10000, 0, 1792041580, 0x84312782f921261287c3f89c3492b39c92d0cd22faa65b38c6ecf0a2fdc2c980, 28, 0xfda25812151107aa106e71635c4a1c596b335d7b05e27f0090659eae46623ddb, 0x7d1d65bded41c04327f289a9f00cc495a4293ac3b0a55b71cafab7072fa108e5)\n  sender:    0xd407e409E34E0b9afb99EcCeb609bDbcD5e7f1bf\n\nDocs: https://viem.sh/docs/contract/writeContract\nDetails: replacement transaction underpriced\nVersion: viem@2.48.11","payer":"0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673","transaction":"","network":"eip155:84532"}
basescan: https://sepolia.basescan.org/tx/

$ curl -i http://localhost:3000/api/weather -H "PAYMENT-SIGNATURE: <base64 of the JSON printed by spy, re-encoded compact>"
HTTP/1.1 200 OK
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
cache-control: private
content-type: application/json
payment-response: eyJzdWNjZXNzIjp0cnVlLCJwYXllciI6IjB4NjJmOUVDYThDQzYzMzI5NzI3MDVlN0Q1YkVkYzlmNzc2Q0ZkRjY3MyIsInRyYW5zYWN0aW9uIjoiMHg4YmVmMjE0YmYzOTQwYTgwNWNjMjA4ZTc3YzgwMTlmZDQwNzZhOTM1YjdhZTk2MDJiZDdjZTJmZDEzYzAzNzUyIiwibmV0d29yayI6ImVpcDE1NTo4NDUzMiJ9
Date: Thu, 15 Oct 2026 05:14:42 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{"report":{"weather":"sunny","temperature":70}}

[balance after]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.95
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.05
```

## e-2. replay a signature whose payment already settled (200)
```
$ pnpm buy http://localhost:3000/api/weather   # key lines
<- 402  payment headers: payment-required
   "nonce": "0xd35d1a0646a1a1729566f73131b052a6d2cfcb3b41d0876cea5f93082412be7b"
   authorization: 0.010000 USDC 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 -> 0x621279161e951eB55195FB872e46CE47C6925506, validBefore 2026-10-15T05:20:09.000Z
<- 200  payment headers: payment-response
status: 200
basescan: https://sepolia.basescan.org/tx/0xc5ce29f77b259c3d8a7ee1813e1e25fd66f4a98d5e960a348015099cadbbb92e

$ curl -i http://localhost:3000/api/weather -H "PAYMENT-SIGNATURE: <same JSON, re-encoded compact base64>"
HTTP/1.1 402 Payment Required
vary: rsc, next-router-state-tree, next-router-prefetch, next-router-segment-prefetch
cache-control: no-store
content-type: application/json
payment-response: eyJzdWNjZXNzIjpmYWxzZSwiZXJyb3JSZWFzb24iOiJpbnZhbGlkX2V4YWN0X2V2bV90cmFuc2FjdGlvbl9mYWlsZWQiLCJwYXllciI6IjB4NjJmOUVDYThDQzYzMzI5NzI3MDVlN0Q1YkVkYzlmNzc2Q0ZkRjY3MyIsInRyYW5zYWN0aW9uIjoiMHg2ZGU5N2RjN2U1NTBjMTcyZWRmMjFmZWEwYTk3YWY3NTEwMTg4NWY5NThlMjk0MThiNTJjMTI5Nzk0NGY3NWMxIiwibmV0d2
Date: Thu, 15 Oct 2026 05:15:11 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Transfer-Encoding: chunked

{}
[payment-required decoded]
Expecting value: line 1 column 1 (char 0)
[balance after]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.94
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.06
```

[payment-response decoded, replay of settled signature]
```
{
 "success": false,
 "errorReason": "invalid_exact_evm_transaction_failed",
 "payer": "0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673",
 "transaction": "0x6de97dc7e550c172edf21fea0a97af75101885f958e29418b52c1297944f75c1",
 "network": "eip155:84532"
}

$ eth_getTransactionReceipt (sepolia.base.org) -> status/from/to/gasUsed
{'status': '0x0', 'from': '0xd407e409e34e0b9afb99ecceb609bdbcd5e7f1bf', 'to': '0x036cbd53842c5426634e7929541ec2318f3dcf7e', 'gasUsed': '0x9fbf', 'blockNumber': '0x2de8140'}
```

## f. public URL (Vercel production alias, deployment protection off)
```
$ curl -i https://paid-api-flax.vercel.app/api/weather   (from this machine; no cookies/auth)
HTTP/2 402 
age: 0
cache-control: no-store
content-type: application/json
date: Thu, 15 Oct 2026 05:18:19 GMT
payment-required: eyJ4NDAyVmVyc2lvbiI6MiwiZXJyb3IiOiJQYXltZW50IHJlcXVpcmVkIiwicmVzb3VyY2UiOnsidXJsIjoiaHR0cHM6Ly9wYWlkLWFwaS1mbGF4LnZlcmNlbC5hcHAvYXBpL3dlYXRoZXIiLCJkZXNjcmlwdGlvbiI6IldlYXRoZXIgZGF0YSIsIm1pbWVUeXBlIjoiIn
server: Vercel
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-matched-path: /api/weather
x-vercel-cache: MISS
x-vercel-id: hnd1::iad1::n9hjc-1792041499057-4cac2cc204a7

{}
[payment-required decoded]
{
    "x402Version": 2,
    "error": "Payment required",
    "resource": {
        "url": "https://paid-api-flax.vercel.app/api/weather",
        "description": "Weather data",
        "mimeType": ""
    },
    "accepts": [
        {
            "scheme": "exact",
            "network": "eip155:84532",
            "amount": "10000",
            "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
            "payTo": "0x621279161e951eB55195FB872e46CE47C6925506",
            "maxTimeoutSeconds": 300,
            "extra": {
                "name": "USDC",
                "version": "2"
            }
        }
    ]
}

$ curl -i https://paid-api-flax.vercel.app/api/free | head -3
HTTP/2 200 
age: 0
cache-control: public, max-age=0, must-revalidate

[balance before]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.94
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.06
$ pnpm buy https://paid-api-flax.vercel.app/api/weather
$ pnpm --filter agent-client buy https://paid-api-flax.vercel.app/api/weather
$ tsx --env-file=../../.env src/buy.ts https://paid-api-flax.vercel.app/api/weather
buyer: 0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673  max-per-call: $0.01  max-total: 0.050000 (spent so far: 0.000000)
-> GET https://paid-api-flax.vercel.app/api/weather
<- 402  payment headers: payment-required
-> request with PAYMENT-SIGNATURE:
<- 200  payment headers: payment-response
status: 200
body: {"report":{"weather":"sunny","temperature":70}}
payment-response: {"success":true,"payer":"0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673","transaction":"0xac36f0b7b8796b190e8b65c79f07a95da585c5bbf28b586d4a509a617d8fc2b2","network":"eip155:84532"}
basescan: https://sepolia.basescan.org/tx/0xac36f0b7b8796b190e8b65c79f07a95da585c5bbf28b586d4a509a617d8fc2b2
[balance after (+8s)]
0x62f9ECa8CC6332972705e7D5bEdc9f776CFdF673 ETH 0 USDC 19.93
0x621279161e951eB55195FB872e46CE47C6925506 ETH 0 USDC 0.07
```
