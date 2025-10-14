// controllers/resultController.js
import asyncHandler from 'express-async-handler';
import Result from '../models/resultModel.js';

// POST /api/results
export const createResult = asyncHandler(async (req, res) => {
  const data = req.body;
  if (req.user.role === 'cr' && data.semester !== req.user.semester) {
    res.status(403);
    throw new Error('CR can only add results for their own semester');
  }
  const doc = await Result.create({ ...data, createdBy: req.user._id });
  res.status(201).json(doc);
});

// GET /api/results/:rollNo
export const getResultByRoll = asyncHandler(async (req, res) => {
  const { rollNo } = req.params;
  const docs = await Result.find({ rollNo });
  if (!docs || docs.length === 0) {
    res.status(404);
    throw new Error('Result not found');
  }
  res.json(docs);
});
