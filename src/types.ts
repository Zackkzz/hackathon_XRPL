// Define the stages for a booking
export enum BookingStatus {
  HELD = 'HELD',               // Step 1: User clicked "Book", timer starts
  CONFIRMED = 'CONFIRMED',     // Step 2: Deposit received on XRPL
  CANCELLED = 'CANCELLED',     // Step 3: Refund requested
  EXPIRED = 'EXPIRED'          // Step 4: No payment received within 10 minutes
}

// Data structure for every guest reservation
export interface Booking {
  id: string;                  // Unique ID shared with the payments person
  eventId: string;             // The specific table or event
  status: BookingStatus;       // Current stage in the process
  holdExpiresAt: number;       // The 10-minute deadline (Unix timestamp)
}
