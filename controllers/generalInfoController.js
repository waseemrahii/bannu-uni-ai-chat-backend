import asyncHandler from "express-async-handler";
import GeneralInfo from "../models/generalInfoModel.js";

/**
 * ✅ Create General Info
 * POST /api/generalinfo
 * Roles: admin, cr
 */
export const createGeneralInfo = asyncHandler(async (req, res) => {
  const { title, content, audience, department, semester } = req.body;

  if (!title || !content) {
    res.status(400);
    throw new Error("Title and content are required");
  }

  // 🧠 Restrict CR to their semester
  if (req.user.role === "cr") {
    if (semester && semester !== req.user.semester) {
      res.status(403);
      throw new Error("CR can only post for their own semester");
    }
  }

  const info = await GeneralInfo.create({
    title,
    content,
    audience,
    department: department || req.user.department,
    semester: semester || (audience === "semester" ? req.user.semester : undefined),
    createdBy: req.user._id,
  });

  res.status(201).json(info);
});

/**
 * ✅ Get All General Info (with filters)
 * GET /api/generalinfo
 */
export const listGeneralInfo = asyncHandler(async (req, res) => {
  const { audience, department, semester, title, content } = req.query;
  const query = {};

  // 🧩 Apply query filters (admin search)
  if (audience) query.audience = audience;
  if (department) query.department = department;
  if (semester) query.semester = semester;
  if (title) query.title = new RegExp(title, "i");
  if (content) query.content = new RegExp(content, "i");

  // 🧠 Access control based on user role
  if (req.user.role === "cr") {
    query.$or = [
      { audience: "all" },
      { audience: "department", department: req.user.department },
      { audience: "semester", semester: req.user.semester, department: req.user.department },
    ];
  } else if (req.user.role === "student") {
    query.$or = [
      { audience: "all" },
      { audience: "department", department: req.user.department },
      { audience: "semester", semester: req.user.semester, department: req.user.department },
    ];
  }
  // Admin sees everything (no restrictions)

  const infos = await GeneralInfo.find(query)
    .populate("createdBy", "name role")
    .sort({ createdAt: -1 });

  res.json(infos);
});

/**
 * ✅ Get Single General Info
 * GET /api/generalinfo/:id
 */
export const getGeneralInfo = asyncHandler(async (req, res) => {
  const info = await GeneralInfo.findById(req.params.id).populate("createdBy", "name role");
  if (!info) {
    res.status(404);
    throw new Error("Information not found");
  }
  res.json(info);
});

/**
 * ✅ Update General Info
 * PUT /api/generalinfo/:id
 * Roles: admin, cr (only their own posts)
 */
export const updateGeneralInfo = asyncHandler(async (req, res) => {
  const info = await GeneralInfo.findById(req.params.id);
  if (!info) {
    res.status(404);
    throw new Error("Information not found");
  }

  // Restrict CR to update only their own posts
  if (req.user.role === "cr" && info.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("CRs can only update their own posts");
  }

  info.title = req.body.title || info.title;
  info.content = req.body.content || info.content;
  info.audience = req.body.audience || info.audience;
  info.department = req.body.department || info.department;
  info.semester = req.body.semester || info.semester;

  const updated = await info.save();
  res.json(updated);
});

/**
 * ✅ Delete General Info
 * DELETE /api/generalinfo/:id
 * Roles: admin, cr (only their own)
 */
export const deleteGeneralInfo = asyncHandler(async (req, res) => {
  const info = await GeneralInfo.findById(req.params.id);
  if (!info) {
    res.status(404);
    throw new Error("Information not found");
  }

  if (req.user.role === "cr" && info.createdBy.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error("CRs can only delete their own posts");
  }

  await info.deleteOne();
  res.json({ message: "Information deleted successfully" });
});
