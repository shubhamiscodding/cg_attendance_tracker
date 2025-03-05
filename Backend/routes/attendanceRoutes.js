const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');

router.get('/', async (req, res) => {
  try {
    const { date, period } = req.query;
    if (!date) return res.status(400).json({ message: 'Date is required' });

    const query = { date };
    if (period && period !== 'all') query.period = period;

    // Fetch attendance records
    const attendanceRecords = await Attendance.find(query).lean();

    // Extract unique studentIds from attendance records
    const studentIds = [...new Set(attendanceRecords.map(record => record.studentId))];

    // Fetch corresponding students using the custom 'id' field
    const students = await Student.find({ id: { $in: studentIds } }).select('name rollNumber email id').lean();

    // Map students to a lookup object for efficiency
    const studentMap = students.reduce((map, student) => {
      map[student.id] = {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email
      };
      return map;
    }, {});

    // Combine attendance records with student data
    const enrichedRecords = attendanceRecords.map(record => ({
      ...record,
      studentId: studentMap[record.studentId] || { id: record.studentId } // Fallback if no match
    }));

    res.json(enrichedRecords);
  } catch (error) {
    console.error('Error in GET /api/attendance:', error.stack);
    res.status(500).json({ message: 'Failed to fetch attendance', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { studentId, date, period, status, timeRange } = req.body;
    if (!studentId || !date || !period || !status) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const hours = timeRange ? calculateHours(timeRange) : 0;
    const attendance = await Attendance.findOneAndUpdate(
      { studentId, date, period },
      { status, timeRange, hours },
      { upsert: true, new: true }
    );
    res.status(201).json(attendance);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    const { date, period, studentsStatus, timeRange } = req.body;
    if (!date || !period || !studentsStatus) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const hours = timeRange ? calculateHours(timeRange) : 0;
    const operations = Object.entries(studentsStatus).map(([studentId, status]) => ({
      updateOne: {
        filter: { studentId, date, period },
        update: { status, timeRange, hours },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(operations);
    res.status(201).json({ message: 'Bulk attendance marked' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

function calculateHours(timeRange) {
  if (!timeRange || !timeRange.startTime || !timeRange.endTime) return 0;
  const [startHour, startMinute] = timeRange.startTime.split(':').map(Number);
  const [endHour, endMinute] = timeRange.endTime.split(':').map(Number);
  const startTimeInMinutes = startHour * 60 + startMinute;
  const endTimeInMinutes = endHour * 60 + endMinute;
  return Math.round((endTimeInMinutes - startTimeInMinutes) / 6) / 10;
}

module.exports = router;