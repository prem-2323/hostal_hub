import express from 'express';
import Complaint from '../models/Complaint';
import User from '../models/User';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Get all complaints (Admin view - Scoped by Block)
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    // Fetch latest user data to ensure valid hostelBlock
    const admin = await User.findById(req.user.id);

    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    // Admin sees only complaints from their block
    const complaints = await Complaint.find({
      hostelBlock: admin.hostelBlock
    })
      .populate('userId', 'name registerId phone roomNumber hostelBlock')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get complaints by user (Student view - their own history)
router.get('/user/:userId', authMiddleware, async (req: any, res) => {
  try {
    // Security check: Only own data or admin of same block
    if (req.params.userId !== req.user.id) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // If admin, check if target user is in same block
      const targetUser = await User.findById(req.params.userId);
      if (!targetUser || targetUser.hostelBlock !== req.user.hostelBlock) {
        return res.status(403).json({ error: 'Unauthorized to view complaints from another block' });
      }
    }

    const complaints = await Complaint.find({ userId: req.params.userId })
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (error) {
    console.error('Error fetching user complaints:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create complaint
router.post('/', authMiddleware, async (req: any, res) => {
  try {
    const { category, description, isAnonymous, photoUrl } = req.body;

    if (!category || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch fresh user data to ensure correct block assignment
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const complaint = new Complaint({
      userId: user._id,
      hostelBlock: user.hostelBlock, // Trusted from DB
      category,
      description,
      isAnonymous: isAnonymous || false,
      photoUrl,
    });

    await complaint.save();
    res.status(201).json(complaint);
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update complaint status (Admin - Scoped)
router.patch('/:id/status', authMiddleware, async (req: any, res) => {
  try {
    const { status, adminRemarks } = req.body;

    // Verify admin and their block
    const admin = await User.findById(req.user.id);
    if (!admin || admin.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    // Find complaint and verify it belongs to admin's block
    const complaint = await Complaint.findOne({
      _id: req.params.id,
      hostelBlock: admin.hostelBlock
    });

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found or unauthorized' });
    }

    // Update the complaint
    complaint.status = status;
    complaint.adminRemarks = adminRemarks;
    complaint.updatedAt = new Date();
    await complaint.save();

    res.json(complaint);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
