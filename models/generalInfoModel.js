// models/generalInfoModel.js
import mongoose from 'mongoose';

const generalInfoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true }, // markdown/plain
  audience: { type: String, enum: ['all','department','semester'], default: 'all' },
  department: { type: String, default: 'CS' },
  semester: { type: String }, // optional if audience === 'semester'
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('GeneralInfo', generalInfoSchema);
