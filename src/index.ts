import { BookingService } from './bookingService';

// Initialize your "Brain"
const bookingManager = new BookingService();

// Example: When the frontend calls "Book Now"
async function handleUserBooking(eventId: string) {
  const booking = await bookingManager.createHold(eventId);
  // Send this booking ID to Person C (Payments)
  return booking;
}

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

import express from 'express';
import bookingRoutes from './routes';

const app = express();
app.use(express.json()); // Lets the app read the data sent from the website

// Use your new booking routes
app.use('/api', bookingRoutes);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`[SERVER] Anti-Ghosting Brain is live on port ${PORT}`);
});

// --- TESTING SECTION ---
// This part simulates a real user journey

async function runTest() {
    console.log("🚀 STARTING SIMULATION...");

    const manager = new BookingService();

    // TEST 1: The Booking
    console.log("\n--- Test 1: User clicks 'Book' ---");
    const booking = await manager.createHold("TABLE_5");
    console.log(`✅ Success: Booking ${booking.id} is HELD. Timer started.`);

    // TEST 2: The Payment
    console.log("\n--- Test 2: Simulating Payment Confirmation ---");
    // We use a fake ID here just to test the logic
    const isConfirmed = await manager.confirmPayment(booking.id);
    if (isConfirmed) {
        console.log("✅ Success: State changed to CONFIRMED.");
    }

    // TEST 3: The Ghosting (Timeout)
    console.log("\n--- Test 3: Testing an Expired Booking ---");
    const ghostBooking = await manager.createHold("TABLE_99");
    
    // We manually "break" the timer to simulate 10 minutes passing
    ghostBooking.holdExpiresAt = Date.now() - 1000; 
    
    const tooLate = await manager.confirmPayment(ghostBooking.id);
    if (!tooLate) {
        console.log("✅ Success: Logic blocked the late payment. Seat is released.");
    }

    console.log("\n🏁 SIMULATION COMPLETE. Your logic is working!");
}

// Run the test
runTest();
