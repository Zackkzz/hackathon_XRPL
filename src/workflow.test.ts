import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { Client, Wallet } from 'xrpl'
import {
  createClient,
  step1ConnectAndFundWallet,
  step2WaitForFunding,
  step3SendPayment,
  step4WaitForConfirmation,
  step5LogTransactionUrl,
} from './workflow.js'

describe('XRPL payment workflow — integration', () => {
  let client: Client
  let recipientWallet: Wallet

  beforeAll(async () => {
    client = createClient()
    await client.connect()
    recipientWallet = Wallet.generate()
  })

  afterAll(async () => {
    await client.disconnect()
  })

  it('completes the full payment workflow end-to-end on testnet', async () => {
    // ── Step 1: generate sender wallet and request faucet funding ────────────
    const senderWallet = await step1ConnectAndFundWallet()

    expect(senderWallet.address).toMatch(/^r[1-9A-HJ-NP-Za-km-z]{24,34}$/)
    expect(senderWallet.seed).toBeTruthy()

    // ── Step 2: wait until the balance is non-zero on the ledger ────────────
    const balance = await step2WaitForFunding(client, senderWallet.address)

    expect(balance).toBeGreaterThan(0)

    // ── Step 3: send 10 XRP to the recipient ────────────────────────────────
    const txHash = await step3SendPayment(
      client,
      senderWallet,
      recipientWallet.address,
      '10000000', // 10 XRP in drops
    )

    expect(txHash).toMatch(/^[A-F0-9]{64}$/)

    // ── Step 4: wait for the payment to appear in a validated ledger ─────────
    const confirmed = await step4WaitForConfirmation(client, txHash)

    expect(confirmed.result.validated).toBe(true)
    expect(confirmed.result.meta.TransactionResult).toBe('tesSUCCESS')

    // ── Step 5: verify the explorer URL is logged correctly ──────────────────
    const logSpy = vi.spyOn(console, 'log')
    step5LogTransactionUrl(txHash)

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(`https://testnet.xrpl.org/transactions/${txHash}`),
    )
  })
})
