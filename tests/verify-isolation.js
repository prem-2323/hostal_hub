const mongoose = require('mongoose');
require('dotenv').config();

const UserSchema = new mongoose.Schema({
    name: String,
    role: String,
    hostelBlock: String,
    registerId: String
});
const User = mongoose.model('User', UserSchema);

const LeaveRequestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    hostelBlock: String,
    status: String
});
const LeaveRequest = mongoose.model('LeaveRequest', LeaveRequestSchema);

async function verifyIsolation() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hostelease');

        console.log('--- ISOLATION VERIFICATION ---');

        // 1. Identify Admin Block
        const admin = await User.findOne({ role: 'admin' });
        if (!admin) { console.log('No Admin found'); return; }
        const adminBlock = admin.hostelBlock;
        console.log(`Admin is in: '${adminBlock}'`);

        // 2. Count Pendings for Admin Block (Should match Dashboard)
        const countForAdmin = await LeaveRequest.countDocuments({ status: 'pending', hostelBlock: adminBlock });
        console.log(`DB Count (Scoped to '${adminBlock}'): ${countForAdmin}`);

        // 3. Count Global Pendings
        const countGlobal = await LeaveRequest.countDocuments({ status: 'pending' });
        console.log(`DB Count (Global): ${countGlobal}`);

        // 4. Check for 'Other' blocks
        const otherRequests = await LeaveRequest.find({ status: 'pending', hostelBlock: { $ne: adminBlock } });
        console.log(`Requests in OTHER blocks: ${otherRequests.length}`);
        if (otherRequests.length > 0) {
            otherRequests.forEach(r => console.log(` - Req in '${r.hostelBlock}'`));
        }

        mongoose.connection.close();
    } catch (e) { console.error(e); }
}

verifyIsolation();
