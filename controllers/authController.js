// controllers/authController.js
import asyncHandler from "express-async-handler";
import User from "../models/userModel.js";
import { generateToken } from "../utils/tokenUtils.js";
import { sendResetEmail } from "../utils/emailHelper.js";
import crypto from "crypto";
import bcrypt from "bcryptjs";

/**
 * ✅ Register User
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
  const {
    name,
    email,
    password,
    role,
    className,
    department,
    session,
    semester,
    rollNo,
    phone,
    gender
  } = req.body;

  const exists = await User.findOne({ email });
  if (exists) {
    res.status(400);
    throw new Error("Email already registered");
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    className,
    department,
    session,
    semester,
    rollNo,
    phone, 
    gender
  });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    className: user.className,
    department: user.department,
    session: user.session,
    semester: user.semester,
    rollNo: user.rollNo,
    phone : user.phone,
    gender: user.gender,
    token: generateToken(user._id),
  });
});

/**
 * ✅ Login User
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      className: user.className,
      department: user.department,
      session: user.session,
      semester: user.semester,
      rollNo: user.rollNo,
      token: generateToken(user._id),
    });
  } else {
    res.status(401);
    throw new Error("Invalid credentials");
  }
});

/**
 * ✅ Get All Users
 * GET /api/auth
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select("-password");
  res.json(users);
});

/**
 * ✅ Get User by ID
 * GET /api/auth/profile/:id
 */
export const getUserById = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }
  res.json(user);
});

/**
 * ✅ Update Profile
 * PUT /api/auth/update-profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  user.name = req.body.name || user.name;
  user.email = req.body.email || user.email;
  user.className = req.body.className || user.className;
  user.department = req.body.department || user.department;
  user.session = req.body.session || user.session;
  user.semester = req.body.semester || user.semester;
  user.rollNo = req.body.rollNo || user.rollNo;

  const updated = await user.save();
  res.json({
    _id: updated._id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    className: updated.className,
    department: updated.department,
    session: updated.session,
    semester: updated.semester,
    rollNo: updated.rollNo,
    token: generateToken(updated._id),
  });
});

/**
 * ✅ Change Password
 * PUT /api/auth/change-password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  const { oldPassword, newPassword } = req.body;

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  if (!(await user.matchPassword(oldPassword))) {
    res.status(400);
    throw new Error("Old password is incorrect");
  }

  user.password = newPassword;
  await user.save();
  res.json({ message: "Password updated successfully" });
});

/**
 * ✅ Forgot Password (email reset link)
 * POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  const resetLink = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

  user.resetPasswordToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 min
  await user.save();

  await sendResetEmail(user.email, resetLink);
  res.json({ message: "Password reset email sent" });
});

/**
 * ✅ Reset Password
 * POST /api/auth/reset-password/:token
 */
export const resetPassword = asyncHandler(async (req, res) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired token");
  }

  user.password = req.body.newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.json({ message: "Password reset successful" });
});

/**
 * ✅ Delete User
 * DELETE /api/auth/:id
 */
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  await user.deleteOne();
  res.json({ message: "User deleted successfully" });
});
