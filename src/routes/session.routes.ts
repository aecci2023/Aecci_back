import { Router } from 'express';
import { SessionController } from '../controllers/session.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Client routes
router.post('/request', authenticate, requireRole(['user']), SessionController.requestSession);
router.get('/my-sessions', authenticate, SessionController.getMySessions);

// Admin routes
router.post('/', authenticate, requireRole(['admin']), SessionController.createSession);
router.get('/admin/pending', authenticate, requireRole(['admin']), SessionController.getPendingSessions);
router.patch('/:id/approve', authenticate, requireRole(['admin']), SessionController.approveSession);
router.patch('/:id/reject', authenticate, requireRole(['admin']), SessionController.rejectSession);

// Partner + admin routes
router.post('/:id/summary', authenticate, requireRole(['partner', 'admin']), SessionController.submitSessionSummary);

// Shared read routes
router.get('/public', SessionController.getSessions);
router.get('/', authenticate, SessionController.getSessions);
router.get('/:id', authenticate, SessionController.getSessionById);

export default router;
