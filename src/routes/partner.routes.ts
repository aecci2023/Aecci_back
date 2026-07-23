import { Router } from 'express';
import { PartnerController } from '../controllers/partner.controller';
import { authenticate, requireRole } from '../middlewares/auth.middleware';

const router = Router();

// Public/User routes
// A normal user applies to become a partner
router.post('/apply', authenticate, PartnerController.applyForPartnership);

// Marketplace client routes (confidential sanitised listings)
router.get('/marketplace/list', authenticate, PartnerController.getMarketplacePartners);
router.get('/marketplace/detail/:userId', authenticate, PartnerController.getMarketplacePartnerDetail);

// Admin routes
// Manually create a partner
router.post('/admin/create', authenticate, requireRole(['admin']), PartnerController.createPartnerManually);

// Get all partner profiles (can filter by status ?status=pending_review)
router.get('/profiles', authenticate, requireRole(['admin']), PartnerController.getPartnerProfiles);

// Update a partner's status (approve/reject/suspend, set tier)
router.put('/profiles/:userId/status', authenticate, requireRole(['admin']), PartnerController.updatePartnerStatus);

// View specific partner profile
router.get('/profiles/:userId', authenticate, requireRole(['admin']), PartnerController.getPartnerProfile);

// Partner routes
// Setup partner profile details (bank, availability, bio)
router.put('/setup', authenticate, requireRole(['partner']), PartnerController.setupPartnerProfile);

// View own partner profile
router.get('/me', authenticate, requireRole(['partner']), PartnerController.getPartnerProfile);

// Deal Room availability (date-wise IST slots)
router.get('/availability', authenticate, requireRole(['partner']), PartnerController.getMyAvailability);
router.put('/availability', authenticate, requireRole(['partner']), PartnerController.saveMyAvailability);

// Read a partner's open bookable slots (clients booking a deal room)
router.get('/:partnerId/open-slots', authenticate, PartnerController.getPartnerOpenSlots);

export default router;
