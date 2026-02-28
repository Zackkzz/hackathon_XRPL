export type EscrowAction = "HOLD" | "REFUND";

export interface EscrowEntry {
    id: string;
    bookingId: string;
    action: EscrowAction;
    amount: number;
    currency: string;
    txHash?: string;
    createdAt: Date;
}

// In-memory ledger
export const escrowLedger: EscrowEntry[] = [];