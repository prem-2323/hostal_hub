import express from 'express';
import MenuSuggestion from '../models/MenuSuggestion';
import User from '../models/User';
import MessMenu from '../models/MessMenu';
import Announcement from '../models/Announcement';
import { authMiddleware } from '../middleware/auth';
import ExcelJS from 'exceljs';

const router = express.Router();

// Helper to get ISO week number
const getWeekNumber = (d: Date) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { week: weekNo, year: d.getUTCFullYear() };
};

// Apply auth middleware
router.use(authMiddleware);

// GET /?week=current (Scoped by Block)
// Supports optional query params forDate (ISO string), mealType, and hostelBlock (admin/debug)
router.get('/', async (req: any, res) => {
  try {
    const { week, forDate, mealType, hostelBlock: requestedBlock } = req.query;
    // Prefer the user's block. Allow override only for admins/debugging
    const uBlock = (req.user?.role === 'admin' && requestedBlock) ? requestedBlock : req.user?.hostelBlock;

    const query: any = {};

    if (uBlock) query.hostelBlock = uBlock;

    // If forDate provided, compute week/year from that date
    if (forDate) {
      const d = new Date(forDate);
      if (!isNaN(d.getTime())) {
        const { week: w, year: y } = getWeekNumber(d);
        query.weekNumber = w;
        query.year = y;
      }
    } else {
      const { week: currentWeek, year } = getWeekNumber(new Date());
      if (week === 'current') {
        query.weekNumber = currentWeek;
        query.year = year;
      }
    }

    if (mealType) {
      // Map flexible client param 'mealType' to stored 'category'
      query.category = mealType;
    }

    const suggestions = await MenuSuggestion.find(query)
      .sort({ voteCount: -1, createdAt: -1 })
      .lean();

    // Add a flag if the current user has voted (defensive - votes may be missing)
    const userId = req.user?.id;
    const weekdayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const weekdayFullNames: Record<string, string> = {
      'sun': 'Sunday', 'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday',
      'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday'
    };

    const enhancedSuggestions = suggestions.map((s: any) => {
      // If a dayOfWeek isn't explicitly set but scheduledDate exists, infer it
      let inferredDay = s.dayOfWeek;
      if (!inferredDay && s.scheduledDate) {
        const d = new Date(s.scheduledDate);
        if (!isNaN(d.getTime())) inferredDay = weekdayNames[d.getDay()];
      }

      return {
        ...s,
        dayOfWeek: inferredDay,
        dayName: inferredDay ? weekdayFullNames[inferredDay.toLowerCase()] : 'Unscheduled',
        hasVoted: userId ? ((s.votes || []).map((id: any) => id.toString()).includes(userId)) : false
      };
    });

    res.json(enhancedSuggestions);
  } catch (error) {
    console.error("Fetch suggestions error:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /suggest
// Logic: specific limit (1 per week), merge duplicates
router.post('/suggest', async (req: any, res) => {
  try {
    const { dishName, category, type, description, frequency, dayOfWeek } = req.body;
    const userId = req.user.id;
    const uBlock = req.user.hostelBlock;

    // 0. Validation
    if (!dishName || !category || !type) {
      return res.status(400).json({ error: 'Missing required fields: dishName, category, and type are required' });
    }

    // 1. Get User Details
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const roomNumber = user.roomNumber;
    if (!roomNumber) return res.status(400).json({ error: 'You must have a room number assigned to make suggestions' });

    const { week, year } = getWeekNumber(new Date());

    // 2. Enforce one suggestion per ROOM for the same week/day
    const roomSuggestionQuery: any = {
      hostelBlock: uBlock,
      weekNumber: week,
      year: year,
      'suggestedBy.roomNumber': roomNumber
    };
    if (dayOfWeek) roomSuggestionQuery.dayOfWeek = dayOfWeek;

    const existingRoomSuggestion = await MenuSuggestion.findOne(roomSuggestionQuery);
    if (existingRoomSuggestion) {
      const roommate = existingRoomSuggestion.suggestedBy.find((s: any) => s.roomNumber === roomNumber);
      return res.status(400).json({
        error: `A suggestion has already been submitted for your room by ${roommate?.name || 'a roommate'} for this period.`
      });
    }

    // 3. Normalize Name
    const normalizedName = dishName.trim().toLowerCase();

    // 4. Check for Duplicate
    const duplicateQuery: any = {
      hostelBlock: uBlock,
      weekNumber: week,
      year: year,
      normalizedName: normalizedName
    };
    if (dayOfWeek) duplicateQuery.dayOfWeek = dayOfWeek;

    let suggestion = await MenuSuggestion.findOne(duplicateQuery);

    if (suggestion) {
      const isAlreadySuggestor = suggestion.suggestedBy.some((s: any) => s.userId?.toString() === userId);
      if (!isAlreadySuggestor) {
        suggestion.suggestedBy.push({ userId, name: user.name, roomNumber });
      }

      const hasVoted = suggestion.votes?.some((v: any) => v.toString() === userId);
      if (!hasVoted) {
        suggestion.votes.push(userId);
        suggestion.voteCount = (suggestion.voteCount || 0) + 1;
      }

      await suggestion.save();
      return res.json(suggestion);
    }

    // 5. Create New Suggestion
    const newSuggestion = new MenuSuggestion({
      hostelBlock: uBlock,
      dishName: dishName.trim(),
      normalizedName,
      category,
      type: type || 'veg',
      frequency: frequency || 'trial',
      description,
      dayOfWeek: dayOfWeek,
      suggestedBy: [{ userId, name: user.name, roomNumber }],
      votes: [userId],
      voteCount: 1,
      weekNumber: week,
      year: year,
      status: 'pending'
    });

    await newSuggestion.save();

    // Notification (Independent try-catch)
    try {
      const newNotif = new Announcement({
        title: "New Menu Suggestion!",
        content: `${user.name} (Room ${roomNumber}) just suggested '${dishName.trim()}' for ${dayOfWeek?.toUpperCase() || 'this week'}'s ${category.toUpperCase()}. Go upvote it!`,
        hostelBlock: uBlock,
        isEmergency: false
      });
      await newNotif.save();
    } catch (annError) {
      console.error("Announcement Error:", annError);
    }

    res.status(201).json(newSuggestion);

  } catch (error: any) {
    console.error("Suggestion Error Details:", error);
    res.status(500).json({ error: error.message || 'Server error processing suggestion' });
  }
});

// POST /:id/vote
router.post('/:id/vote', async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const uBlock = req.user.hostelBlock;

    const suggestion = await MenuSuggestion.findOne({ _id: id, hostelBlock: uBlock });
    if (!suggestion) return res.status(404).json({ error: 'Suggestion not found or from another block' });

    // Safe comparison for ObjectId vs String
    const voteIndex = suggestion.votes.findIndex((v: any) => v.toString() === userId);

    if (voteIndex === -1) {
      // Upvote
      suggestion.votes.push(userId);
      suggestion.voteCount += 1;
    } else {
      // Remove Vote (Toggle)
      suggestion.votes.splice(voteIndex, 1);
      suggestion.voteCount = Math.max(0, suggestion.voteCount - 1);
    }

    await suggestion.save();
    res.json({ id: suggestion._id, voteCount: suggestion.voteCount, hasVoted: voteIndex === -1 });

  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ADMIN: Update Status
router.patch('/:id/status', async (req: any, res) => {
  try {
    const uBlock = req.user.hostelBlock;
    const { status, adminRemarks, scheduledDate } = req.body;
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });

    const suggestion = await MenuSuggestion.findOne({ _id: req.params.id, hostelBlock: uBlock });
    if (!suggestion) return res.status(404).json({ error: 'Suggestion not found or unauthorized' });

    suggestion.status = status;
    if (adminRemarks) suggestion.adminRemarks = adminRemarks;
    if (scheduledDate) suggestion.scheduledDate = scheduledDate;

    // AUTO-SYNC: If scheduled, create a MessMenu entry if it doesn't exist for that slot
    if (status === 'scheduled' && scheduledDate) {
      const sDate = new Date(scheduledDate);
      sDate.setHours(0, 0, 0, 0);

      const existingMenu = await MessMenu.findOne({
        hostelBlock: uBlock,
        date: {
          $gte: new Date(sDate.setHours(0, 0, 0, 0)),
          $lte: new Date(sDate.setHours(23, 59, 59, 999))
        },
        mealType: suggestion.category === 'snacks' ? 'dinner' : suggestion.category // Map snacks to evening/dinner for now or keep as is
      });

      if (!existingMenu) {
        const newMenu = new MessMenu({
          hostelBlock: uBlock,
          mealType: suggestion.category === 'snacks' ? 'dinner' : suggestion.category,
          items: [suggestion.dishName],
          date: sDate,
          isDefault: false
        });
        await newMenu.save();
      } else {
        // Append to existing menu items if not already there
        if (!existingMenu.items.includes(suggestion.dishName)) {
          existingMenu.items.push(suggestion.dishName);
          await existingMenu.save();
        }
      }
    }

    await suggestion.save();
    res.json(suggestion);

  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /export/kitchen (Export Approved/Scheduled for the week)
router.get('/export/kitchen', async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const uBlock = req.user.hostelBlock;

    const { week, year } = getWeekNumber(new Date());
    const suggestions = await MenuSuggestion.find({
      hostelBlock: uBlock,
      status: { $in: ['approved', 'scheduled'] }
    }).sort({ category: 1, voteCount: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Kitchen Menu Suggestions');

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    worksheet.columns = [
      { header: 'Day', key: 'day', width: 15 },
      { header: 'Dish Name', key: 'dishName', width: 25 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Votes', key: 'voteCount', width: 10 },
      { header: 'Frequency', key: 'frequency', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Allergens', key: 'allergens', width: 20 },
      { header: 'Notes', key: 'description', width: 30 }
    ];

    // Style the header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    const weekdayFullNames: Record<string, string> = {
      'sun': 'Sunday', 'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday',
      'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday'
    };

    suggestions.forEach(s => {
      let dayVal = s.dayOfWeek ? weekdayFullNames[s.dayOfWeek.toLowerCase()] : '';
      if (!dayVal && s.scheduledDate) {
        dayVal = new Date(s.scheduledDate).toLocaleDateString('en-US', { weekday: 'long' });
      }

      worksheet.addRow({
        day: dayVal,
        dishName: s.dishName,
        category: s.category.toUpperCase(),
        type: s.type.toUpperCase(),
        voteCount: s.voteCount,
        frequency: s.frequency,
        status: s.status,
        allergens: (s.allergens || []).join(', '),
        description: s.description || ''
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Kitchen_Menu_${uBlock}_W${week}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Export Error:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /export/excel (Top 4 per category, per day)
router.get('/export/excel', async (req: any, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    const uBlock = req.user.hostelBlock;

    const { week, year } = getWeekNumber(new Date());
    const suggestions = await MenuSuggestion.find({
      hostelBlock: uBlock,
      weekNumber: week,
      year: year
    }).sort({ voteCount: -1 });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Top Menu Suggestions');

    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    worksheet.columns = [
      { header: 'Day', key: 'day', width: 15 },
      { header: 'Meal Session', key: 'category', width: 15 },
      { header: 'Dish Name', key: 'dishName', width: 25 },
      { header: 'Likes (Votes)', key: 'voteCount', width: 10 },
      { header: 'Suggestions Count', key: 'sugCount', width: 15 }
    ];

    // Header Styling
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

    const days = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
    const categories = ['breakfast', 'lunch', 'dinner', 'snacks'];
    const weekdayFullNames: Record<string, string> = {
      'sun': 'Sunday', 'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday',
      'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday'
    };

    days.forEach(day => {
      categories.forEach(cat => {
        // Filter suggestions for this day and category, take TOP 4 because they are already sorted by voteCount
        const topDishes = suggestions
          .filter(s => s.dayOfWeek === day && s.category === cat)
          .slice(0, 4);

        topDishes.forEach(dish => {
          worksheet.addRow({
            day: weekdayFullNames[day],
            category: cat.toUpperCase(),
            dishName: dish.dishName,
            voteCount: dish.voteCount,
            sugCount: (dish.suggestedBy || []).length
          });
        });

        if (topDishes.length > 0) {
          // Add a spacer row after each section
          worksheet.addRow({});
        }
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Top_Suggestions_${uBlock}_W${week}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error("Advanced Export Error:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;