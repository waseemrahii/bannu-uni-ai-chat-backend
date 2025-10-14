// models/messageModel.js
import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // null for system/AI
  content: { type: String, required: true },
  isAI: { type: Boolean, default: false }
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);
