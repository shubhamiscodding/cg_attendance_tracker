const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  studentId: { type: String, ref: 'Student', required: true },
  date: { type: String, required: true },
  period: { type: String, required: true },
  status: { type: String, enum: ['present', 'absent'], required: true },
  timeRange: {
    startTime: { type: String },
    endTime: { type: String },
  },
  hours: { type: Number, default: 0 },
}, { timestamps: true });

attendanceSchema.index({ studentId: 1, date: 1, period: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);