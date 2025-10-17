// controllers/resultController.js
import asyncHandler from "express-async-handler";
import Result from "../models/resultModel.js";
import User from "../models/userModel.js"; // if you need to search by username, etc.

// ====================== CREATE RESULT ======================
export const createResult = asyncHandler(async (req, res) => {
  const data = req.body;

  if (req.user.role === "cr" && data.semester !== req.user.semester) {
    res.status(403);
    throw new Error("CR can only add results for their own semester");
  }

  const doc = await Result.create({ ...data, createdBy: req.user._id });
  res.status(201).json(doc);
});

// ====================== GET ALL RESULTS (with filtering) ======================
export const getAllResults = asyncHandler(async (req, res) => {
  const { rollNo, studentName, semester, className, createdBy, subject, role } = req.query;

  const query = {};

  if (rollNo) query.rollNo = new RegExp(rollNo, "i");
  if (studentName) query.studentName = new RegExp(studentName, "i");
  if (semester) query.semester = semester;
  if (className) query.className = className;

  // Optional: search by creator (admin or CR)
  if (createdBy) query.createdBy = createdBy;

  // Optional: filter by user role (admin, cr, student)
  if (role) {
    const users = await User.find({ role });
    const userIds = users.map((u) => u._id);
    query.createdBy = { $in: userIds };
  }

  // Optional: search by subject inside items
  if (subject) {
    query["items.subject"] = new RegExp(subject, "i");
  }

  const docs = await Result.find(query).populate("createdBy", "name role");
  res.json(docs);
});

// ====================== GET SINGLE RESULT ======================
export const getResultById = asyncHandler(async (req, res) => {
  const doc = await Result.findById(req.params.id).populate("createdBy", "name role");
  if (!doc) {
    res.status(404);
    throw new Error("Result not found");
  }
  res.json(doc);
});

// ====================== GET RESULT BY ROLL NO ======================
export const getResultByRoll = asyncHandler(async (req, res) => {
  const { rollNo } = req.params;
  const docs = await Result.find({ rollNo });
  if (!docs || docs.length === 0) {
    res.status(404);
    throw new Error("Result not found");
  }
  res.json(docs);
});

// ====================== UPDATE RESULT ======================
export const updateResult = asyncHandler(async (req, res) => {
  const result = await Result.findById(req.params.id);
  if (!result) {
    res.status(404);
    throw new Error("Result not found");
  }

  // Only admin or the creator (CR) can update
  if (req.user.role !== "admin" && result.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to update this result");
  }

  const updated = await Result.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });

  res.json(updated);
});

// ====================== DELETE RESULT ======================
export const deleteResult = asyncHandler(async (req, res) => {
  const result = await Result.findById(req.params.id);
  if (!result) {
    res.status(404);
    throw new Error("Result not found");
  }

  if (req.user.role !== "admin" && result.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to delete this result");
  }

  await result.deleteOne();
  res.json({ message: "Result deleted successfully" });
});




// // controllers/resultController.js
// import asyncHandler from 'express-async-handler';
// import Result from '../models/resultModel.js';

// // POST /api/results
// export const createResult = asyncHandler(async (req, res) => {
//   const data = req.body;
//   if (req.user.role === 'cr' && data.semester !== req.user.semester) {
//     res.status(403);
//     throw new Error('CR can only add results for their own semester');
//   }
//   const doc = await Result.create({ ...data, createdBy: req.user._id });
//   res.status(201).json(doc);
// });

// // GET /api/results/:rollNo
// export const getResultByRoll = asyncHandler(async (req, res) => {
//   const { rollNo } = req.params;
//   const docs = await Result.find({ rollNo });
//   if (!docs || docs.length === 0) {
//     res.status(404);
//     throw new Error('Result not found');
//   }
//   res.json(docs);
// });
