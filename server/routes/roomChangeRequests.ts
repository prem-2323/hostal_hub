import express from 'express';
import RoomChangeRequest from '../models/RoomChangeRequest';
import User from '../models/User';
import Room from '../models/Room';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Get all room change requests for a user
router.get('/user/:userId', authMiddleware, async (req: any, res) => {
    try {
        // Security: Ensure user is viewing their own requests OR is an admin of the same block
        if (req.user.id !== req.params.userId) {
            if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            // If admin, check if target user is in same block
            const targetUser = await User.findById(req.params.userId);
            if (!targetUser || targetUser.hostelBlock !== req.user.hostelBlock) {
                return res.status(403).json({ error: 'Unauthorized to view requests from another block' });
            }
        }

        const requests = await RoomChangeRequest.find({ userId: req.params.userId }).sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Create a room change request
router.post('/', authMiddleware, async (req: any, res) => {
    try {
        const { userId, currentRoom, requestedRoom, reason } = req.body;

        // Security: Identify user from token or verify body matches token
        if (userId !== req.user.id) {
            return res.status(403).json({ error: 'Cannot create request for another user' });
        }

        // Fetch user to ensure valid block
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Auto-assign Block
        const hostelBlock = user.hostelBlock;

        // Check for existing pending request
        const existing = await RoomChangeRequest.findOne({ userId, status: 'pending' });
        if (existing) {
            return res.status(400).json({ error: 'You already have a pending room change request' });
        }

        // Validate Requested Room Existence (if provided)
        if (requestedRoom) {
            const roomExists = await Room.findOne({
                roomNumber: { $regex: new RegExp(`^${requestedRoom.trim()}$`, 'i') },
                hostelBlock: { $regex: new RegExp(`^${hostelBlock.trim()}$`, 'i') }
            });

            if (!roomExists) {
                return res.status(400).json({ error: 'Invalid Room: The requested room does not exist in your hostel.' });
            }
        }

        const request = new RoomChangeRequest({
            userId,
            currentRoom,
            requestedRoom: requestedRoom?.trim(),
            reason,
            hostelBlock // Strictly from User DB
        });

        await request.save();
        res.status(201).json(request);
    } catch (error) {
        console.error("Room change request error:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Get all requests for a hostel block
router.get('/hostel/:hostelBlock', authMiddleware, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin only' });
        }

        // Strict Isolation
        if (req.user.hostelBlock !== req.params.hostelBlock) {
            return res.status(403).json({ error: 'Unauthorized to view other hostel blocks' });
        }

        const requests = await RoomChangeRequest.find({ hostelBlock: req.params.hostelBlock })
            .populate('userId', 'name registerId')
            .sort({ createdAt: -1 });
        res.json(requests);
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin: Update request status
router.put('/:id', authMiddleware, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin only' });
        }

        const { status, adminRemarks } = req.body;
        const requestId = req.params.id;

        const request = await RoomChangeRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Strict Isolation check
        if (request.hostelBlock !== req.user.hostelBlock) {
            return res.status(403).json({ error: 'Unauthorized to manage requests from another block' });
        }

        // If approving, perform the actual room change
        if (status === 'approved' && request.status !== 'approved') {
            if (!request.requestedRoom) {
                return res.status(400).json({ error: 'No requested room specified in request' });
            }

            // check if room exists and has space
            let newRoom = await Room.findOne({
                roomNumber: { $regex: new RegExp(`^${request.requestedRoom.trim()}$`, 'i') },
                hostelBlock: { $regex: new RegExp(`^${request.hostelBlock.trim()}$`, 'i') }
            });

            if (!newRoom) {
                return res.status(404).json({ error: 'Requested room no longer exists in database' });
            }

            if (newRoom.currentOccupancy >= newRoom.capacity) {
                return res.status(400).json({ error: 'Requested room is already full' });
            }

            // Update User
            await User.findByIdAndUpdate(request.userId, {
                roomNumber: request.requestedRoom
            });

            // Update new room occupancy
            newRoom.currentOccupancy += 1;
            await newRoom.save();

            // Decrease old room occupancy
            const oldRoom = await Room.findOne({
                roomNumber: request.currentRoom,
                hostelBlock: request.hostelBlock
            });
            if (oldRoom) {
                if (oldRoom.currentOccupancy > 0) {
                    oldRoom.currentOccupancy -= 1;
                    await oldRoom.save();
                }
            } else {
                // If old room doesn't exist in Room collection, we don't need to do anything
                // but we could optionally create it with its real occupancy minus 1
                // However, it's simpler to just ignore if it's not tracked.
            }
        }

        request.status = status;
        request.adminRemarks = adminRemarks;
        request.updatedAt = new Date();
        await request.save();

        res.json(request);
    } catch (error) {
        console.error("Update room change error:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
