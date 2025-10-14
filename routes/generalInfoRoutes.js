// routes/generalInfoRoutes.js
import express from 'express';
import { createGeneralInfo, listGeneralInfo } from '../controllers/generalInfoController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { allowRoles } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.post('/', protect, allowRoles('admin','cr'), createGeneralInfo);
router.get('/', protect, listGeneralInfo);

export default router;
