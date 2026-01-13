import express from 'express';
import { authMiddleware } from '../middleware/auth';
import ExcelJS from 'exceljs';
import User from '../models/User';
import Announcement from '../models/Announcement';

const router = express.Router();

// In-memory storage for polls (replace with MongoDB model in production)
interface FoodPoll {
  _id: string;
  hostelBlock: string;
  title: string;
  description?: string;
  foods: Array<{
    name: string;
    votes: string[]; // User IDs
    _id: string;
  }>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Temporary in-memory storage
const polls: Map<string, FoodPoll> = new Map();

// Helper to generate ID
const generateId = () => Math.random().toString(36).substr(2, 9);

// Initialize with sample polls for testing
const initializeSamplePolls = () => {
  // Sample polls will be created on-demand per hostel block
  // See GET / endpoint for auto-creation logic
};

// Initialize sample data
initializeSamplePolls();

// GET all polls for user's hostel block
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const hostelBlock = req.user?.hostelBlock;
    if (!hostelBlock) {
      return res.status(400).json({ error: 'User not assigned to a hostel block' });
    }

    // Ensure sample poll exists for this hostel block
    const samplePollId = `sample-poll-${hostelBlock}`;
    if (!polls.has(samplePollId)) {
      const samplePoll: FoodPoll = {
        _id: samplePollId,
        hostelBlock: hostelBlock,
        title: "Vote",
        description: "6 options • 1 votes",
        foods: [
          { _id: generateId(), name: "Dosa", votes: [] },
          { _id: generateId(), name: "Idli", votes: [] },
          { _id: generateId(), name: "Vada", votes: [] },
        ],
        createdBy: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };
      polls.set(samplePollId, samplePoll);
    }

    const blockPolls = Array.from(polls.values())
      .filter(p => p.hostelBlock === hostelBlock)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(p => ({
        ...p,
        foods: p.foods.map(f => ({
          ...f,
          voteCount: f.votes.length,
          hasVoted: f.votes.includes(req.user.id)
        }))
      }));

    res.json(blockPolls);
  } catch (error) {
    console.error('Error fetching polls:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET single poll by ID
router.get('/:pollId', authMiddleware, async (req: any, res) => {
  try {
    const poll = polls.get(req.params.pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (poll.hostelBlock !== req.user?.hostelBlock) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const enhancedPoll = {
      ...poll,
      foods: poll.foods.map(f => ({
        ...f,
        voteCount: f.votes.length,
        hasVoted: f.votes.includes(req.user.id),
        votes: [] // Don't expose vote user IDs to client
      }))
    };

    res.json(enhancedPoll);
  } catch (error) {
    console.error('Error fetching poll:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST create new poll (admin only)
router.post('/', authMiddleware, async (req: any, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create polls' });
    }

    const { title, description, foods } = req.body;
    const hostelBlock = req.user?.hostelBlock;

    if (!title || !foods || !Array.isArray(foods) || foods.length === 0) {
      return res.status(400).json({ error: 'Title and at least one food item required' });
    }

    const pollId = generateId();
    const newPoll: FoodPoll = {
      _id: pollId,
      hostelBlock,
      title,
      description: description || '',
      foods: foods.map(name => ({
        _id: generateId(),
        name: name.trim(),
        votes: []
      })),
      createdBy: req.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    };

    polls.set(pollId, newPoll);

    // Automatically create an announcement for the poll
    try {
      const announcement = new Announcement({
        title: `📊 New Food Poll: ${title}`,
        content: `Vote for your favorite dishes! ${foods.length} options available.`,
        isEmergency: false,
        isHoliday: false,
        pollId: pollId,
        hostelBlock: hostelBlock
      });
      await announcement.save();
    } catch (announcementError) {
      console.error('Failed to create poll announcement:', announcementError);
      // Don't fail the poll creation if announcement fails
    }

    res.json({
      ...newPoll,
      foods: newPoll.foods.map(f => ({
        ...f,
        voteCount: 0,
        hasVoted: false,
        votes: []
      }))
    });
  } catch (error) {
    console.error('Error creating poll:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST vote on a food item
router.post('/:pollId/vote', authMiddleware, async (req: any, res) => {
  try {
    const { foodId } = req.body;
    const pollId = req.params.pollId;
    const userId = req.user.id;

    console.log(`Vote attempt - PollID: ${pollId}, FoodID: ${foodId}, UserID: ${userId}`);
    console.log(`Available polls in memory: ${Array.from(polls.keys()).join(", ")}`);

    if (!foodId) {
      return res.status(400).json({ error: 'Food ID required' });
    }

    const poll = polls.get(pollId);
    if (!poll) {
      console.log(`Poll ${pollId} not found`);
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (poll.hostelBlock !== req.user?.hostelBlock) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const foodItem = poll.foods.find(f => f._id === foodId);
    if (!foodItem) {
      return res.status(404).json({ error: 'Food item not found' });
    }

    // Check if user already voted for this food
    const alreadyVoted = foodItem.votes.includes(userId);
    if (alreadyVoted) {
      // Remove vote (toggle)
      foodItem.votes = foodItem.votes.filter(id => id !== userId);
    } else {
      // Remove user's vote from other foods (one vote per poll per user)
      poll.foods.forEach(f => {
        f.votes = f.votes.filter(id => id !== userId);
      });
      // Add new vote
      foodItem.votes.push(userId);
    }

    poll.updatedAt = new Date();
    polls.set(pollId, poll);

    const enhancedPoll = {
      ...poll,
      foods: poll.foods.map(f => ({
        ...f,
        voteCount: f.votes.length,
        hasVoted: f.votes.includes(userId),
        votes: []
      }))
    };

    res.json(enhancedPoll);
  } catch (error) {
    console.error('Error voting:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET export poll results as Excel
router.get('/:pollId/export', authMiddleware, async (req: any, res) => {
  try {
    const pollId = req.params.pollId;
    const poll = polls.get(pollId);

    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (poll.hostelBlock !== req.user?.hostelBlock) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Sort foods by vote count (highest to lowest)
    const sortedFoods = [...poll.foods].sort((a, b) => b.votes.length - a.votes.length);
    const totalVotes = sortedFoods.reduce((sum, f) => sum + f.votes.length, 0);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Food Poll Results');

    // Add title and metadata
    worksheet.columns = [
      { header: 'Rank', key: 'rank', width: 8 },
      { header: 'Food Item', key: 'food', width: 30 },
      { header: 'Votes', key: 'votes', width: 12 },
      { header: 'Percentage', key: 'percentage', width: 15 }
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' }
    };

    // Add data rows
    sortedFoods.forEach((food, index) => {
      const percentage = totalVotes > 0 ? ((food.votes.length / totalVotes) * 100).toFixed(2) : '0.00';
      worksheet.addRow({
        rank: index + 1,
        food: food.name,
        votes: food.votes.length,
        percentage: `${percentage}%`
      });
    });

    // Add summary
    worksheet.addRow({});
    worksheet.addRow({
      food: 'Total Votes',
      votes: totalVotes
    });

    // Generate filename based on poll title and creation date
    const dateStr = poll.createdAt.toLocaleDateString('en-IN').replace(/\//g, '-');
    const filename = `${poll.title}-${dateStr}.xlsx`;

    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting poll:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE close poll (admin only)
router.delete('/:pollId', authMiddleware, async (req: any, res) => {
  try {
    console.log(`🔴 DELETE request received for pollId: ${req.params.pollId}`);
    console.log(`🔴 User role: ${req.user?.role}, hostelBlock: ${req.user?.hostelBlock}`);
    
    if (req.user?.role !== 'admin') {
      console.log(`🔴 User is not admin, rejecting`);
      return res.status(403).json({ error: 'Only admins can close polls' });
    }

    const pollId = req.params.pollId;
    console.log(`🔴 Attempting to close poll: ${pollId}`);
    console.log(`🔴 Available polls in map: ${Array.from(polls.keys()).join(', ')}`);
    
    const poll = polls.get(pollId);

    if (!poll) {
      console.log(`🔴 Poll ${pollId} not found in map`);
      return res.status(404).json({ error: 'Poll not found' });
    }

    console.log(`🔴 Poll found. Current hostelBlock: ${poll.hostelBlock}, User hostelBlock: ${req.user?.hostelBlock}`);
    
    if (poll.hostelBlock !== req.user?.hostelBlock) {
      console.log(`🔴 Hostel block mismatch`);
      return res.status(403).json({ error: 'Unauthorized' });
    }

    poll.isActive = false;
    poll.updatedAt = new Date();
    polls.set(pollId, poll);

    console.log(`🔴 Poll ${pollId} closed successfully. isActive is now: ${poll.isActive}`);

    // Delete associated announcement when poll closes
    try {
      await Announcement.deleteOne({ pollId: pollId });
      console.log(`🔴 Associated announcement deleted for poll: ${pollId}`);
    } catch (err) {
      console.error(`🔴 Error deleting announcement for poll ${pollId}:`, err);
      // Don't fail the poll close if announcement deletion fails
    }

    res.json({
      ...poll,
      foods: poll.foods.map(f => ({
        ...f,
        voteCount: f.votes.length,
        hasVoted: f.votes.includes(req.user.id),
        votes: []
      }))
    });
  } catch (error) {
    console.error('🔴 Error closing poll:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
