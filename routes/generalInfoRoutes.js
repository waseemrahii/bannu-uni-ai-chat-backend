// routes/generalInfoRoutes.js
import express from "express";
import {
  createGeneralInfo,
  listGeneralInfo,
  getGeneralInfo,
  updateGeneralInfo,
  deleteGeneralInfo,
} from "../controllers/generalInfoController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { allowRoles } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// ✅ Create & Get All - Updated endpoint to match frontend
router.post("/", protect, allowRoles("admin", "cr"), createGeneralInfo);
router.get("/", protect, listGeneralInfo);

// ✅ Get One
router.get("/:id", protect, getGeneralInfo);

// ✅ Update & Delete
router.put("/:id", protect, allowRoles("admin", "cr"), updateGeneralInfo);
router.delete("/:id", protect, allowRoles("admin", "cr"), deleteGeneralInfo);

export default router;