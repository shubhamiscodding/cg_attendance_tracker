const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');

router.get('/', async (req, res) => {
  try {
    console.log('GET /api/students: Fetching all students');
    const students = await Student.find();
    console.log('GET /api/students: Found', students.length, 'students');
    res.json(students);
  } catch (error) {
    console.error('GET /api/students: Error:', error.stack);
    res.status(500).json({ message: 'Failed to fetch students', error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, rollNumber, email, id, seatRow, seatColumn } = req.body;
    if (!name || !rollNumber || seatRow === undefined || seatColumn === undefined) {
      return res.status(400).json({ message: 'Name, rollNumber, seatRow, and seatColumn are required' });
    }

    console.log('POST /api/students: Adding student:', { name, rollNumber, email, id, seatRow, seatColumn });
    const student = new Student({
      name,
      rollNumber,
      email: email || '',
      id: id || Date.now().toString(),
      seatRow,
      seatColumn,
    });
    const savedStudent = await student.save();
    console.log('POST /api/students: Saved student:', savedStudent);
    res.status(201).json(savedStudent);
  } catch (error) {
    console.error('POST /api/students: Error:', error.stack);
    res.status(400).json({ message: error.message });
  }
});

router.post('/bulk', async (req, res) => {
  try {
    console.log('POST /api/students/bulk: Bulk adding students:', req.body);
    const students = req.body.map(student => {
      if (!student.name || !student.rollNumber || student.seatRow === undefined || student.seatColumn === undefined) {
        throw new Error('Each student must have a name, rollNumber, seatRow, and seatColumn');
      }
      return {
        name: student.name,
        rollNumber: student.rollNumber,
        email: student.email || '',
        id: student.id || Date.now().toString() + Math.random().toString(36).substr(2, 5),
        seatRow: student.seatRow,
        seatColumn: student.seatColumn,
      };
    });
    const savedStudents = await Student.insertMany(students);
    console.log('POST /api/students/bulk: Saved', savedStudents.length, 'students');
    res.status(201).json(savedStudents);
  } catch (error) {
    console.error('POST /api/students/bulk: Error:', error.stack);
    res.status(400).json({ message: error.message });
  }
});

router.delete('/many', async (req, res) => {
  try {
    console.log('DELETE /api/students/many: Attempting to delete all students');
    const deleteResult = await Student.deleteMany({});
    console.log('DELETE /api/students/many: Delete result:', deleteResult);

    if (deleteResult.deletedCount === 0) {
      console.log('DELETE /api/students/many: No students found to delete');
      return res.status(404).json({ message: 'No students found to delete' });
    }

    await Attendance.deleteMany({});
    console.log('DELETE /api/students/many: Deleted all attendance records');
    res.json({ message: `Deleted ${deleteResult.deletedCount} students and all attendance records` });
  } catch (error) {
    console.error('DELETE /api/students/many: Error:', error.stack);
    res.status(500).json({ message: 'Failed to delete students', error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    console.log('PUT /api/students/:id: Updating student with ID:', req.params.id);
    const student = await Student.findOne({ id: req.params.id });
    if (!student) {
      console.log('PUT /api/students/:id: Student not found');
      return res.status(404).json({ message: 'Student not found' });
    }

    student.name = req.body.name || student.name;
    student.rollNumber = req.body.rollNumber || student.rollNumber;
    student.email = req.body.email || student.email;
    student.seatRow = req.body.seatRow !== undefined ? req.body.seatRow : student.seatRow;
    student.seatColumn = req.body.seatColumn !== undefined ? req.body.seatColumn : student.seatColumn;
    const updatedStudent = await student.save();
    console.log('PUT /api/students/:id: Updated student:', updatedStudent);
    res.json(updatedStudent);
  } catch (error) {
    console.error('PUT /api/students/:id: Error:', error.stack);
    res.status(400).json({ message: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    console.log('DELETE /api/students/:id: Deleting student with ID:', req.params.id);
    const student = await Student.findOne({ id: req.params.id });
    if (!student) {
      console.log('DELETE /api/students/:id: Student not found');
      return res.status(404).json({ message: 'Student not found' });
    }

    await Student.deleteOne({ id: req.params.id });
    await Attendance.deleteMany({ studentId: req.params.id });
    console.log('DELETE /api/students/:id: Student deleted');
    res.json({ message: 'Student deleted' });
  } catch (error) {
    console.error('DELETE /api/students/:id: Error:', error.stack);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;