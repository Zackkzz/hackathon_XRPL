import express from 'express';
import { BookingService } from './bookingService';

const router = express.Router();
const brain = new BookingService();

// The "Book" Button: Frontend calls this to start the 10-minute timer
router.post('/book', async (req, res) => {
    const { eventId } = req.body;
    const booking = await brain.createHold(eventId);
    res.json(booking); // Sends the booking ID and timer back to the user
});

// The "Payment Success" Trigger: Person C calls this when they see RLUSD
router.post('/confirm', async (req, res) => {
    const { bookingId, txHash } = req.body;
    const success = await brain.verifyAndConfirm(bookingId, txHash);
    
    if (success) {
        res.json({ message: "Success! Table is yours." });
    } else {
        res.status(400).json({ message: "Payment failed or too late." });
    }
});

export default router;
