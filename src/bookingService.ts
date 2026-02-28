import { Booking, BookingStatus } from './types';
import { v4 as uuidv4 } from 'uuid'; // You'll need to run: npm install uuid

export class BookingService {
  // Temporary storage (clipboard) for all bookings during the hackathon
  private bookings: Map<string, Booking> = new Map();

  // TASK: Start a new booking hold
  async createHold(eventId: string): Promise<Booking> {
    const bookingId = uuidv4();
    const expiry = Date.now() + (10 * 60 * 1000); // Set 10-minute timer

    const newBooking: Booking = {
      id: bookingId,
      eventId: eventId,
      status: BookingStatus.HELD,
      holdExpiresAt: expiry
    };

    this.bookings.set(bookingId, newBooking);
    console.log(`[The Brain] Created hold ${bookingId} for event ${eventId}.`);
    return newBooking;
  }

  // TASK: Confirm booking when RLUSD arrives (Called by Person C)
  async confirmPayment(bookingId: string): Promise<boolean> {
    const booking = this.bookings.get(bookingId);
    if (!booking) return false;

    // The Anti-Ghosting Guard: Is the user on time?
    if (Date.now() < booking.holdExpiresAt) {
      booking.status = BookingStatus.CONFIRMED;
      console.log(`[The Brain] Booking ${bookingId} is now CONFIRMED!`);
      return true;
    } else {
      booking.status = BookingStatus.EXPIRED;
      console.log(`[The Brain] Booking ${bookingId} EXPIRED. Release the seat.`);
      return false;
    }
  }
}
import { XrplConnection } from './xrplClient';
import { BookingStatus } from './types';

export class BookingService {
  private xrpl = new XrplConnection();

  // This function is what Person C (Payments) will trigger
  async verifyAndConfirm(bookingId: string, transactionHash: string) {
    // 1. Connect to the ledger
    const client = await this.xrpl.connect();

    try {
      // 2. Look up the transaction using the hash Person C gave us
      const tx = await client.request({
        command: "tx",
        transaction: transactionHash
      });

      // 3. Simple Logic: If the transaction exists and was successful...
      if (tx.result.validated) {
        console.log(`[The Brain] Blockchain confirms payment for ${bookingId}!`);
        // Here you would update your clipboard status to CONFIRMED
        return true;
      }
    } catch (error) {
      console.error("[The Brain] Could not find that transaction on the ledger.");
    }
    return false;
  }
}
