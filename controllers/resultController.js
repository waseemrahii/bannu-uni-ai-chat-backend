// controllers/resultController.js
import asyncHandler from "express-async-handler";
import Result from "../models/resultModel.js";
import User from "../models/userModel.js";

// ====================== CREATE RESULT ======================
export const createResult = asyncHandler(async (req, res) => {
  const data = req.body;

  // Validate CR permissions
  if (req.user.role === "cr" && data.semester !== req.user.semester) {
    res.status(403);
    throw new Error("CR can only add results for their own semester");
  }

  // Check for duplicate subjects
  const subjects = data.items.map(item => item.subject);
  const duplicateSubjects = await Result.checkDuplicateSubjects(
    data.rollNo, 
    data.semester, 
    subjects
  );

  if (duplicateSubjects.length > 0) {
    res.status(400);
    throw new Error(`Duplicate subjects found: ${duplicateSubjects.join(', ')}`);
  }

  // Validate marks range
  const invalidMarks = data.items.filter(item => item.marks < 0 || item.marks > 100);
  if (invalidMarks.length > 0) {
    res.status(400);
    throw new Error("Marks must be between 0 and 100");
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
  const { semester } = req.query;
  
  const query = { rollNo };
  if (semester) query.semester = semester;
  
  const docs = await Result.find(query).populate("createdBy", "name role");
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

  // If updating items, check for duplicates
  if (req.body.items) {
    const subjects = req.body.items.map(item => item.subject);
    const duplicateSubjects = await Result.checkDuplicateSubjects(
      result.rollNo,
      result.semester,
      subjects
    );

    // Remove current result's subjects from duplicate check
    const filteredDuplicates = duplicateSubjects.filter(
      subject => !result.items.some(item => item.subject === subject)
    );

    if (filteredDuplicates.length > 0) {
      res.status(400);
      throw new Error(`Duplicate subjects found: ${filteredDuplicates.join(', ')}`);
    }

    // Validate marks range
    const invalidMarks = req.body.items.filter(item => item.marks < 0 || item.marks > 100);
    if (invalidMarks.length > 0) {
      res.status(400);
      throw new Error("Marks must be between 0 and 100");
    }
  }

  const updated = await Result.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.json(updated);
});

// ====================== ADD SUBJECT TO EXISTING RESULT ======================
export const addSubjectToResult = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { subject, marks } = req.body;

  const result = await Result.findById(id);
  if (!result) {
    res.status(404);
    throw new Error("Result not found");
  }

  // Check authorization
  if (req.user.role !== "admin" && result.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("Not authorized to update this result");
  }

  // Check if subject already exists
  const subjectExists = result.items.some(item => item.subject === subject);
  if (subjectExists) {
    res.status(400);
    throw new Error(`Subject '${subject}' already exists for this student`);
  }

  // Validate marks
  if (marks < 0 || marks > 100) {
    res.status(400);
    throw new Error("Marks must be between 0 and 100");
  }

  // Calculate grade
  const grade = calculateGrade(marks);

  // Add new subject
  result.items.push({ subject, marks, grade });
  await result.save();

  res.json(result);
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

// Grade calculation helper function
function calculateGrade(marks) {
  if (marks >= 90) return 'A+';
  if (marks >= 80) return 'A';
  if (marks >= 70) return 'B';
  if (marks >= 60) return 'C';
  if (marks >= 50) return 'D';
  if (marks >= 40) return 'E';
  return 'F';
}