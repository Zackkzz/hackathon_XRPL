import express, { Request, Response } from 'express';
import cors from 'cors';
// Assuming the database logic is in the same file or imported
import { mockDB, getEntityStats } from './database.js'; 

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// --- POINT 1: GET /events (For the Dropdown) ---
app.get('/events', (req: Request, res: Response) => {
    // Returns a simple list for the frontend dropdown
    const list = mockDB.map(e => ({
        id: e.id,
        name: e.name,
        category: e.category
    }));
    res.json(list);
});

// --- POINT 2: GET /events/:id/availability ---
app.get('/events/:id/availability', (req: Request, res: Response) => {
    const entity = mockDB.find(e => e.id === req.params.id);
    
    if (!entity) {
        return res.status(404).json({ error: "Event not found" });
    }

    const stats = getEntityStats(entity.name);
    res.json(stats);
});

// --- POINT 3: (Internal) POST /events/:id/hold-seat ---
// This is called by Person B (Blockchain) once the user starts the transaction
app.post('/events/:id/hold-seat', (req: Request, res: Response) => {
    const entity = mockDB.find(e => e.id === req.params.id);

    if (!entity) {
        return res.status(404).json({ error: "Event not found" });
    }

    if (entity.capacity - entity.currentBookings <= 0) {
        return res.status(400).json({ error: "No seats left to hold" });
    }

    // Increment bookings to "lock" the seat
    entity.currentBookings += 1;

    res.json({
        success: true,
        message: "Seat held successfully",
        remaining: entity.capacity - entity.currentBookings
    });
});

app.listen(PORT, () => {
    console.log(`Person A Service running on port ${PORT}`);
});
