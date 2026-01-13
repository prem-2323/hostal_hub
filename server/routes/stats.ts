import express from "express";
import User from "../models/User";
import Attendance from "../models/Attendance";
import LeaveRequest from "../models/LeaveRequest";
import Complaint from "../models/Complaint";
import MenuSuggestion from "../models/MenuSuggestion";
import RoomChangeRequest from "../models/RoomChangeRequest";
import HostelSettings from "../models/HostelSettings";
import Room from "../models/Room";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.get("/admin", authMiddleware, async (req: any, res) => {
    try {
        if (req.user.role !== "admin") {
            return res.status(403).json({ message: "Admins only" });
        }

        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const adminBlock = req.user.hostelBlock;
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const students = await User.find({ role: "student", hostelBlock: adminBlock }).select("_id name registerId roomNumber phone");
        const studentIds = students.map(s => s._id);

        const [attendancesToday, approvedLeavesToday, hostelSettings, pendingLeaveCount, openComplaintCount, recentSuggestions, pendingRoomChanges, rooms] = await Promise.all([
            Attendance.find({ userId: { $in: studentIds }, date: { $gte: todayStart, $lte: todayEnd }, isPresent: true }),
            LeaveRequest.find({
                status: "approved",
                hostelBlock: adminBlock,
                fromDate: { $lte: todayEnd },
                toDate: { $gte: todayStart }
            }),
            HostelSettings.findOne({ hostelBlock: adminBlock }),
            LeaveRequest.countDocuments({ status: "pending", hostelBlock: adminBlock }),
            Complaint.countDocuments({ status: { $ne: "resolved" }, hostelBlock: adminBlock }),
            MenuSuggestion.find({ hostelBlock: adminBlock }).sort({ createdAt: -1 }).limit(3),
            RoomChangeRequest.countDocuments({ status: "pending", hostelBlock: adminBlock }),
            Room.find({ hostelBlock: adminBlock }).lean()
        ]);

        const presentIds = new Set(attendancesToday.map(a => a.userId.toString()));
        const isHostelLeaveToday = hostelSettings &&
            hostelSettings.leaveWindowLabel &&
            hostelSettings.leaveWindowFrom &&
            hostelSettings.leaveWindowTo &&
            todayEnd >= new Date(new Date(hostelSettings.leaveWindowFrom).setHours(0, 0, 0, 0)) &&
            todayStart <= new Date(new Date(hostelSettings.leaveWindowTo).setHours(23, 59, 59, 999));

        const isHolidayToday = !!isHostelLeaveToday;
        const absentStudents: any[] = [];
        const leaveStudents: any[] = [];

        students.forEach(student => {
            if (!presentIds.has(student._id.toString())) {
                const isOnApprovedLeave = approvedLeavesToday.some(l => l.userId.toString() === student._id.toString());
                if (isOnApprovedLeave || isHolidayToday) {
                    leaveStudents.push(student);
                } else {
                    absentStudents.push(student);
                }
            }
        });

        // Calculate room stats
        const roomOccupancyMap = new Map();
        students.forEach(student => {
            if (student.roomNumber) {
                roomOccupancyMap.set(student.roomNumber, (roomOccupancyMap.get(student.roomNumber) || 0) + 1);
            }
        });

        const totalRoomsCount = rooms.length;
        const vacantRoomsCount = rooms.filter(room => (roomOccupancyMap.get(room.roomNumber) || 0) === 0).length;

        res.json({
            studentCount: students.length,
            attendanceCount: presentIds.size,
            leaveCount: leaveStudents.length,
            absentCount: absentStudents.length,
            pendingLeaveCount,
            openComplaintCount,
            pendingRoomChanges,
            absentStudents,
            leaveStudents,
            recentSuggestions,
            totalRoomsCount,
            vacantRoomsCount,
            isHoliday: isHolidayToday,
            holidayLabel: isHostelLeaveToday ? (hostelSettings?.leaveWindowLabel || "LEAVE") : ""
        });
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ error: "Server error" });
    }
});

export default router;
