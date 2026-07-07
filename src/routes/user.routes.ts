import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Admin-only: list all users
router.get('/', authenticate, requireRole(['admin']), UserController.getUsers);

// Authenticated: get user by ID (auth checks inside controller)
router.get('/:id', authenticate, UserController.getUserById);

// Admin-only: update verification status
router.patch('/:id/verification', authenticate, requireRole(['admin']), UserController.updateVerificationStatus);
// Authenticated: mark tour as completed
router.patch('/complete-tour', authenticate, UserController.completeTour);

export default router;
