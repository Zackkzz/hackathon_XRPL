import { Wallet } from 'xrpl'
import {
  createClient,
  step1ConnectAndFundWallet,
  step2WaitForFunding,
  step3SendPayment,
  step4WaitForConfirmation,
  step5LogTransactionUrl,
  step6Exit,
} from './workflow.js'

async function main(): Promise<void> {
  const client = createClient()
  await client.connect()
  console.log('Connected to XRPL testnet\n')

  // A second wallet acts as the payment recipient in this demo
  const recipientWallet = Wallet.generate()
  console.log(`Recipient address: ${recipientWallet.address}\n`)

  // Step 1 — generate + faucet-fund the sender wallet
  const senderWallet = await step1ConnectAndFundWallet()

  // Step 2 — wait until the faucet funding lands on-ledger
  await step2WaitForFunding(client, senderWallet.address)

  // Step 3 — send 10 XRP (10 000 000 drops) to the recipient
  const txHash = await step3SendPayment(
    client,
    senderWallet,
    recipientWallet.address,
    '10000000',
  )

  // Step 4 — wait for the payment to be confirmed in a validated ledger
  await step4WaitForConfirmation(client, txHash)

  // Step 5 — print the explorer URL
  step5LogTransactionUrl(txHash)

  // Step 6 — clean up and exit
  await step6Exit(client)
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
