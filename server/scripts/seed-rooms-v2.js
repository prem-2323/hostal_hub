const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    roomNumber: { type: String, required: true },
    hostelBlock: { type: String, required: true },
    block: { type: String },
    capacity: { type: Number, default: 4 },
    currentOccupancy: { type: Number, default: 0 },
});

const Room = mongoose.models.Room || mongoose.model('Room', RoomSchema);

const HOSTELS = [
    "Kaveri Ladies Hostel",
    "Amaravathi Ladies Hostel",
    "Bhavani Ladies Hostel",
    "Dheeran Mens Hostel",
    "Valluvar Mens Hostel",
    "Ilango Mens Hostel",
    "Bharathi Mens Hostel",
    "Kamban Mens Hostel",
    "Ponnar Mens Hostel",
    "Sankar Mens Hostel",
];

const BLOCKS = ["A", "B", "C", "D"];

async function seed() {
    try {
        await mongoose.connect('mongodb+srv://myhostel:23-Sep-06@notes.egwneyv.mongodb.net/hostelease?appName=notes');
        console.log('Connected to hostelease');

        // DELETE ALL EXISTING ROOMS
        const delResult = await Room.deleteMany({});
        console.log(`Deleted ${delResult.deletedCount} existing rooms`);

        for (const hostel of HOSTELS) {
            console.log(`Seeding ${hostel}...`);
            const roomDocs = [];
            for (const blockLetter of BLOCKS) {
                for (let i = 1; i <= 30; i++) {
                    roomDocs.push({
                        roomNumber: `${blockLetter}${i}`,
                        hostelBlock: hostel,
                        block: blockLetter,
                        capacity: 4,
                        currentOccupancy: 0
                    });
                }
            }
            await Room.insertMany(roomDocs);
            console.log(`  Added ${roomDocs.length} rooms to ${hostel}`);
        }

        console.log('Seeding finished successfully!');
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

seed();
