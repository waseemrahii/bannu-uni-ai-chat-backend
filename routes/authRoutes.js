// routes/authRoutes.js
import express from 'express';
import { register, login } from '../controllers/authController.js';

import {
  getAllUsers,
  getUserById,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  deleteUser,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
// import { adminOnly } from "../middlewares/roleMiddleware.js";

const router = express.Router();

router.post('/register', register);
router.post('/login', login);



router.get("/", protect,  getAllUsers);
router.delete("/:id", protect,  deleteUser);

// User Routes
router.get("/profile/:id", protect, getUserById);
router.put("/update-profile", protect, updateProfile);
router.put("/change-password", protect, changePassword);

// Forgot / Reset Password
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

export default router;
