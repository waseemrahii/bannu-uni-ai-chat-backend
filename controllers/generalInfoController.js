// controllers/generalInfoController.js
import asyncHandler from 'express-async-handler';
import GeneralInfo from '../models/generalInfoModel.js';

// POST /api/general-info
export const createGeneralInfo = asyncHandler(async (req, res) => {
  const data = req.body;
  if (req.user.role === 'cr' && data.audience === 'department') {
    // allow CR to create only if department matches and optionally semester
    if (data.semester && data.semester !== req.user.semester) {
      res.status(403);
      throw new Error('CR cannot add general info for other semesters');
    }
  }
  const doc = await GeneralInfo.create({ ...data, createdBy: req.user._id });
  res.status(201).json(doc);
});

// GET /api/general-info
export const listGeneralInfo = asyncHandler(async (req, res) => {
  const { department, semester } = req.query;
  // Return items targeted to: all OR department matching user OR semester matching user
  const filter = {};
  if (department) filter.department = department;
  if (semester) filter.semester = semester;
  // For API consumed by UI we might allow query params; server-side chat will filter more strictly.
  const docs = await GeneralInfo.find(filter).sort({ createdAt: -1 });
  res.json(docs);
});
