const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
    roomNumber: { type: String, required: true },
    hostelBlock: { type: String, required: true },
    block: { type: String },
    capacity: { type: Number, default: 4 },
    currentOccupancy: { type: Number, default: 0 },
});

const Room = mongoose.model('Room', RoomSchema);

async function addKaveriRoom() {
    await mongoose.connect('mongodb://localhost:27017/hostel_db');

    const room = new Room({
        roomNumber: 'K101',
        hostelBlock: 'Kaveri Ladies Hostel',
        block: 'K',
        capacity: 4,
        currentOccupancy: 0
    });

    await room.save();
    console.log('Room K101 added to Kaveri Ladies Hostel');

    await mongoose.disconnect();
}

addKaveriRoom();
