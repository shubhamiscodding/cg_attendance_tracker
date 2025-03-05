const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  rollNumber: { type: String, required: true, unique: true },
  email: { type: String, default: '' },
  id: { type: String, required: true, unique: true, default: () => Date.now().toString() },
  seatRow: { type: Number, required: true, min: 0, max: 6 }, // 7 rows (0-6)
  seatColumn: { type: Number, required: true, min: 0, max: 7 }, // 8 columns (0-7)
}, { timestamps: true });

// Ensure unique seat positions
studentSchema.index({ seatRow: 1, seatColumn: 1 }, { unique: true });

module.exports = mongoose.model('Student', studentSchema);