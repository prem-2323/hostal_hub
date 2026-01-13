import express from 'express';
import MealRating from '../models/MealRating';
import MessMenu from '../models/MessMenu';
import { authMiddleware } from '../middleware/auth';
import mongoose from 'mongoose';

const router = express.Router();

// Submit a rating
router.post('/', authMiddleware, async (req: any, res) => {
    try {
        const { menuItemId, rating, feedback } = req.body;
        const userId = req.user.id;
        const hostelBlock = req.user.hostelBlock;

        // 1. Verify the menu item exists and belongs to the user's block
        const menuItem = await MessMenu.findOne({ _id: menuItemId, hostelBlock });
        if (!menuItem) {
            return res.status(404).json({ error: 'Menu item not found or unauthorized' });
        }

        // 2. Prevent duplicate ratings
        const existingRating = await MealRating.findOne({ userId, menuItemId });
        if (existingRating) {
            return res.status(400).json({ error: 'You have already rated this meal' });
        }

        // 3. Create rating
        const mealRating = new MealRating({
            menuItemId,
            userId,
            hostelBlock,
            rating,
            feedback,
            mealType: menuItem.mealType,
            date: menuItem.date || new Date(), // Fallback to current date if missing
        });

        await mealRating.save();
        res.status(201).json(mealRating);
    } catch (error) {
        console.error("Meal Rating Error:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get ratings for a specific menu item (Public view for students to see "Popularity")
router.get('/item/:menuItemId', authMiddleware, async (req: any, res) => {
    try {
        const { menuItemId } = req.params;
        const ratings = await MealRating.find({ menuItemId }).populate('userId', 'name');

        const stats = await MealRating.aggregate([
            { $match: { menuItemId: new mongoose.Types.ObjectId(menuItemId) } },
            {
                $group: {
                    _id: "$menuItemId",
                    avgRating: { $avg: "$rating" },
                    count: { $sum: 1 }
                }
            }
        ]);

        res.json({
            ratings,
            stats: stats[0] || { avgRating: 0, count: 0 }
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Admin stats: Get rating trends
router.get('/admin/stats', authMiddleware, async (req: any, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin only' });
        }

        const { hostelBlock } = req.user;

        const stats = await MealRating.aggregate([
            { $match: { hostelBlock } },
            {
                $group: {
                    _id: "$mealType",
                    avgRating: { $avg: "$rating" },
                    totalRatings: { $sum: 1 }
                }
            }
        ]);

        // Get top 5 highest rated items (joined with MessMenu to get dish names)
        const topRated = await MealRating.aggregate([
            { $match: { hostelBlock } },
            {
                $group: {
                    _id: "$menuItemId",
                    avgRating: { $avg: "$rating" },
                    count: { $sum: 1 }
                }
            },
            { $sort: { avgRating: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'messmenus',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'menuInfo'
                }
            },
            { $unwind: '$menuInfo' }
        ]);

        res.json({
            overview: stats,
            topRated
        });
    } catch (error) {
        console.error("Rating Stats Error:", error);
        res.status(500).json({ error: 'Server error' });
    }
});

export default router;
