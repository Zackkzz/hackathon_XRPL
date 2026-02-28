# xrp-aus-2026-workshop

A simple demo of an XRP payment on testnet, written in TypeScript.

## What it does

1. Generates a new wallet and funds it from the testnet faucet
2. Waits for the funding to land on the ledger by polling the XRP balance
3. Sends a payment to a second wallet
4. Waits for the payment to be confirmed in a validated ledger
5. Prints the XRPL explorer link for the transaction

Each step is its own function in `src/workflow.ts`.

## Run it

```bash
npm install
npm start
```

## Test

```bash
npm test
```

The integration test runs the full workflow against testnet and takes about a few seconds.

## Requirements

Node.js 18+
