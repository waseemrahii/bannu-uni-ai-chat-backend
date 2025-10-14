// models/resultModel.js
import mongoose from 'mongoose';

const resultSchema = new mongoose.Schema({
  rollNo: { type: String, required: true },
  studentName: String,
  semester: { type: String, required: true },
  className: { type: String, enum: ["A", "B", "C"] },
  items: [
    {
      subject: { type: String, required: true },
      marks: { type: Number },
      grade: { type: String }
    }
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

resultSchema.index({ rollNo: 1, semester: 1 }, { unique: false });

export default mongoose.model('Result', resultSchema);
