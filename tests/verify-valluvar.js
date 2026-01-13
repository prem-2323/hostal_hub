const mongoose = require('mongoose');
require('dotenv').config();

const LeaveRequestSchema = new mongoose.Schema({
    hostelBlock: String,
    status: String
});
const LeaveRequest = mongoose.model('LeaveRequest', LeaveRequestSchema);

async function fix() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostelease');

        // The previous debug showed:
        // Admin (gophi) -> 'Valluvar Mens Hostel'
        // Request -> 'Kaveri Ladies Hostel'
        // Exact Match -> false

        // THIS MEANS GOPHI SHOULD SEE ZERO.
        // IF HE SEES 1, THEN THE STATS QUERY IS WRONG.

        // But wait, the previous screenshot showed User "gophi" seeing "1 Pending Leaves".
        // AND "2 Open Complaints".

        // Let's check if there are ANY requests in "Valluvar Mens Hostel"
        const valluvarRequests = await LeaveRequest.find({
            status: 'pending',
            hostelBlock: 'Valluvar Mens Hostel'
        });
        console.log(`Valluvar Requests: ${valluvarRequests.length}`);

        mongoose.connection.close();
    } catch (e) { console.error(e); }
}

fix();
