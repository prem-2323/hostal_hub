import mongoose from 'mongoose';
import dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function checkUsers() {
    await mongoose.connect(MONGODB_URI);
    const users = await mongoose.connection.db.collection('users').find().toArray();
    console.log('--- USERS IN HOSTELEASE DATABASE ---');
    users.forEach(u => console.log(` - _id: ${u._id}, registerId: ${u.registerId}, Name: ${u.name}`));
    await mongoose.disconnect();
}

checkUsers().catch(console.error);
