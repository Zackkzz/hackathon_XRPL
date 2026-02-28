export interface BookingEntity {
    id: string;
    category: string;
    name: string;
    subCategory: string;
    capacity: number;
    currentBookings: number;
    depositRLUSD: number;
    walletAddress: string;
}

export const mockDB: BookingEntity[] = [
    {
        id: 'hosp_1',
        category: 'Hospital',
        name: 'St. Marys',
        subCategory: 'Cardiology',
        capacity: 10,
        currentBookings: 4,
        depositRLUSD: 50,
        walletAddress: 'rP9jpyP9Z2y4zLpU7V6B7XqY9S7F2y5P9'
    },
    {
        id: 'hosp_2',
        category: 'Hospital',
        name: 'London Central',
        subCategory: 'ER',
        capacity: 5,
        currentBookings: 5,
        depositRLUSD: 50,
        walletAddress: 'rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh'
    },
    {
        id: 'rest_1',
        category: 'Restaurant',
        name: 'The Golden Duck',
        subCategory: 'Fine Dining',
        capacity: 20,
        currentBookings: 18,
        depositRLUSD: 10,
        walletAddress: 'r3km6K9W3S3S3S3S3S3S3S3S3S3S3S3S3S'
    },
    {
        id: 'rest_2',
        category: 'Restaurant',
        name: 'Pasta Palace',
        subCategory: 'Italian',
        capacity: 15,
        currentBookings: 5,
        depositRLUSD: 15,
        walletAddress: 'rPT1S7S7S7S7S7S7S7S7S7S7S7S7S7S7S7'
    }
];

export function getEntityStats(name: string): any {
    const normalizedQuery = name.toLowerCase().trim();
    const entity = mockDB.find(
        (e) => e.name.toLowerCase().trim() === normalizedQuery
    );

    if (entity) {
        const remainingSeats = entity.capacity - entity.currentBookings;
        if (remainingSeats <= 0) {
            return "No seats available";
        }
        return {
            availableSeats: remainingSeats,
            totalCapacity: entity.capacity,
            depositRequiredRLUSD: entity.depositRLUSD,
            walletAddress: entity.walletAddress,
            entityDetails: entity
        };
    }

    // Fallback to "Generic Event" if the name isn't found
    const newEvent: BookingEntity = {
        id: `evt_${Date.now()}`,
        category: 'Event',
        name: name.trim(),
        subCategory: 'Generic Event',
        capacity: 100,
        currentBookings: 0,
        depositRLUSD: 20,
        walletAddress: 'r3km6K9W3S3S3S3S3S3S3S3S3S3S3S3S3S' // reusing a testnet address
    };

    return {
        availableSeats: newEvent.capacity - newEvent.currentBookings,
        totalCapacity: newEvent.capacity,
        depositRequiredRLUSD: newEvent.depositRLUSD,
        walletAddress: newEvent.walletAddress,
        entityDetails: newEvent,
        note: "Created Generic Event entry as requested name was not found."
    };
}
