import { Router } from 'express';
import { authenticate, requireRole } from '../middlewares/auth.middleware';
import { getAdminDashboardStats } from '../controllers/admin.controller';

const router = Router();

router.get('/dashboard', authenticate, requireRole(['admin']), getAdminDashboardStats);

export default router;
