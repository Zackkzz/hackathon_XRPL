import { Client, Wallet, Payment, dropsToXrp } from 'xrpl'

const TESTNET_WS_URL = 'wss://s.altnet.rippletest.net:51233'
const FAUCET_URL = 'https://faucet.altnet.rippletest.net/accounts'
const EXPLORER_BASE_URL = 'https://testnet.xrpl.org/transactions'
const POLL_INTERVAL_MS = 2_000

// ---- Types ------------------------------------------------------------------

interface FaucetResponse {
  account: {
    address: string
  }
  amount: number
  balance: number
}

export interface ValidatedTxResult {
  result: {
    validated: boolean
    hash: string
    meta: {
      TransactionResult: string
    }
  }
}

// ---- Helpers ----------------------------------------------------------------

export function createClient(): Client {
  return new Client(TESTNET_WS_URL)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ---- Step functions ---------------------------------------------------------

/**
 * Step 1: Generate a new wallet and request funding from the testnet faucet.
 * Returns immediately after submitting the faucet request.
 */
export async function step1ConnectAndFundWallet(): Promise<Wallet> {
  const wallet = Wallet.generate()
  console.log(`[Step 1] Generated wallet address: ${wallet.address}`)
  console.log('[Step 1] Requesting funds from testnet faucet...')

  const response = await fetch(FAUCET_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destination: wallet.address, userAgent: 'xrpl-workshop' }),
  })

  if (!response.ok) {
    throw new Error(`Faucet request failed: ${response.status} ${response.statusText}`)
  }

  const data = (await response.json()) as FaucetResponse
  console.log(`[Step 1] Faucet dispatched ${data.amount} XRP to ${wallet.address}`)

  return wallet
}

/**
 * Step 2: Poll the ledger until the account balance is non-zero.
 * Returns the funded XRP balance.
 */
export async function step2WaitForFunding(
  client: Client,
  address: string,
  timeoutMs = 60_000,
): Promise<number> {
  console.log(`[Step 2] Waiting for ${address} to be funded...`)
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const balance = await client.getXrpBalance(address)
      if (balance > 0) {
        console.log(`[Step 2] Balance confirmed: ${balance} XRP`)
        return balance
      }
    } catch {
      // Account not yet visible on the ledger — keep polling
    }
    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error(`Timeout: ${address} was not funded within ${timeoutMs / 1_000}s`)
}

/**
 * Step 3: Build, sign, and submit a Payment transaction.
 * Returns the transaction hash.
 */
export async function step3SendPayment(
  client: Client,
  senderWallet: Wallet,
  destinationAddress: string,
  amountDrops: string,
): Promise<string> {
  console.log(
    `[Step 3] Sending ${dropsToXrp(amountDrops)} XRP → ${destinationAddress}`,
  )

  const payment: Payment = {
    TransactionType: 'Payment',
    Account: senderWallet.address,
    Destination: destinationAddress,
    Amount: amountDrops,
  }

  const prepared = await client.autofill(payment)
  const { tx_blob, hash } = senderWallet.sign(prepared)

  await client.submit(tx_blob)
  console.log(`[Step 3] Payment submitted. Hash: ${hash}`)

  return hash
}

/**
 * Step 4: Poll the ledger until the transaction is validated.
 * Returns the full validated transaction result.
 */
export async function step4WaitForConfirmation(
  client: Client,
  txHash: string,
  timeoutMs = 60_000,
): Promise<ValidatedTxResult> {
  console.log(`[Step 4] Waiting for tx ${txHash} to be validated...`)
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    try {
      const response = (await client.request({
        command: 'tx',
        transaction: txHash,
        binary: false,
      })) as unknown as ValidatedTxResult

      if (response.result.validated) {
        const txResult = response.result.meta.TransactionResult
        console.log(`[Step 4] Confirmed on ledger. Result: ${txResult}`)
        return response
      }
    } catch {
      // Transaction not yet in a validated ledger — keep polling
    }
    await sleep(POLL_INTERVAL_MS)
  }

  throw new Error(`Timeout: tx ${txHash} was not confirmed within ${timeoutMs / 1_000}s`)
}

/**
 * Step 5: Log the XRPL explorer URL for the transaction.
 */
export function step5LogTransactionUrl(txHash: string): void {
  const url = `${EXPLORER_BASE_URL}/${txHash}`
  console.log(`[Step 5] Explorer URL: ${url}`)
}

/**
 * Step 6: Disconnect from the XRPL client and exit the process.
 */
export async function step6Exit(client: Client): Promise<void> {
  console.log('[Step 6] Disconnecting...')
  await client.disconnect()
  console.log('[Step 6] Done.')
  process.exit(0)
}
