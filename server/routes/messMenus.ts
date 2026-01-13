import express from 'express';
import MessMenu from '../models/MessMenu';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Get all mess menus (Scoped by Block)
router.get('/', authMiddleware, async (req: any, res) => {
  try {
    const { hostelBlock } = req.user;
    const menus = await MessMenu.find({ hostelBlock }).sort({ date: 1 });
    res.json(menus);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get menu by date (Scoped by Block)
router.get('/:date', authMiddleware, async (req: any, res) => {
  try {
    const date = new Date(req.params.date);
    const { hostelBlock } = req.user;

    // 1. Fetch specific menus for this date
    const specificMenus = await MessMenu.find({
      date: {
        $gte: new Date(date.setHours(0, 0, 0, 0)),
        $lte: new Date(date.setHours(23, 59, 59, 999))
      },
      hostelBlock
    });

    const foundMealTypes = specificMenus.map(m => m.mealType);
    const allMealTypes: ('breakfast' | 'lunch' | 'dinner')[] = ['breakfast', 'lunch', 'dinner'];
    const missingMealTypes = allMealTypes.filter(type => !foundMealTypes.includes(type));

    let finalMenus = [...specificMenus];

    // 2. If some meal types are missing, fetch defaults for them
    if (missingMealTypes.length > 0) {
      const dayOfWeek = new Date(req.params.date).getDay();
      const defaultMenus = await MessMenu.find({
        isDefault: true,
        dayOfWeek,
        hostelBlock,
        mealType: { $in: missingMealTypes }
      });
      finalMenus = [...finalMenus, ...defaultMenus];
    }

    // Sort to maintain consistency
    finalMenus.sort((a, b) => {
      const order: Record<string, number> = { breakfast: 0, lunch: 1, dinner: 2 };
      return (order[a.mealType] ?? 0) - (order[b.mealType] ?? 0);
    });

    res.json(finalMenus);
  } catch (error) {
    console.error("Fetch menu error:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create mess menu (Admin Only - Scoped)
router.post('/', authMiddleware, async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const { hostelBlock } = req.user;

    // Force specific fields for security
    const menuData = {
      ...req.body,
      hostelBlock // Ensure it's the admin's block
    };

    const menu = new MessMenu(menuData);
    await menu.save();
    res.status(201).json(menu);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update mess menu (Admin Only - Scoped)
router.put('/:id', authMiddleware, async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    // Ensure Admin can only edit their block's menu
    const menu = await MessMenu.findOneAndUpdate(
      { _id: req.params.id, hostelBlock: req.user.hostelBlock },
      req.body,
      { new: true }
    );

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found or unauthorized' });
    }
    res.json(menu);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete mess menu (Admin Only - Scoped)
router.delete('/:id', authMiddleware, async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }

    const menu = await MessMenu.findOneAndDelete({
      _id: req.params.id,
      hostelBlock: req.user.hostelBlock
    });

    if (!menu) {
      return res.status(404).json({ error: 'Menu not found or unauthorized' });
    }
    res.json({ message: 'Menu deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;