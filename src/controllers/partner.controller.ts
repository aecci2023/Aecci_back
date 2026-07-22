import { Request, Response } from 'express';
import { PartnerService } from '../services/partner.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class PartnerController {
  static async applyForPartnership(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const data = req.body;
      const partnerProfile = await PartnerService.createApplication(userId, data);

      res.status(201).json({
        success: true,
        message: 'Partnership application submitted successfully',
        data: partnerProfile
      });
    } catch (error: any) {
      console.error('Error submitting application:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to submit application' });
    }
  }

  static async getPartnerProfiles(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const profiles = await PartnerService.getProfiles(status as string);
      
      res.status(200).json({
        success: true,
        data: profiles
      });
    } catch (error) {
      console.error('Error fetching partner profiles:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch partner profiles' });
    }
  }

  static async getPartnerProfile(req: AuthenticatedRequest, res: Response) {
    try {
      // Admin requests another user's profile, or partner requests their own
      const targetUserId = req.params.userId || req.user.id;
      
      let profile = await PartnerService.getProfileByUserId(targetUserId);
      
      // If partner has no profile yet, auto-create one
      if (!profile && targetUserId === req.user.id) {
        const { prisma } = await import('../config/db.config');
        await prisma.partnerProfile.create({
          data: {
            userId: targetUserId,
            organization: '',
            expertiseCountries: [],
            expertiseSectors: [],
            status: 'approved',
            tier: 'Standard',
          },
        });
        profile = await PartnerService.getProfileByUserId(targetUserId);
      }

      if (!profile) {
        return res.status(404).json({ success: false, message: 'Partner profile not found' });
      }

      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error) {
      console.error('Error fetching partner profile:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch partner profile' });
    }
  }

  static async updatePartnerStatus(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { status, tier, reason } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required' });
      }

      const profile = await PartnerService.updateStatus(userId as string, status as string, tier as string | undefined, reason as string | undefined);

      res.status(200).json({
        success: true,
        message: `Partner status updated to ${status}`,
        data: profile
      });
    } catch (error) {
      console.error('Error updating partner status:', error);
      res.status(500).json({ success: false, message: 'Failed to update partner status' });
    }
  }

  static async setupPartnerProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user.id;
      const data = req.body;
      
      const profile = await PartnerService.updateSetupInfo(userId, data);

      res.status(200).json({
        success: true,
        message: 'Partner setup updated successfully',
        data: profile
      });
    } catch (error) {
      console.error('Error updating partner setup:', error);
      res.status(500).json({ success: false, message: 'Failed to update partner setup' });
    }
  }

  static async createPartnerManually(req: Request, res: Response) {
    try {
      const data = req.body;
      if (!data.email || !data.fullName) {
        return res.status(400).json({ success: false, message: 'Email and Full Name are required' });
      }

      const result = await PartnerService.createPartnerManually(data);

      res.status(201).json({
        success: true,
        message: 'Partner created manually successfully',
        data: result
      });
    } catch (error: any) {
      console.error('Error creating partner manually:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to create partner manually' });
    }
  }

  static async getMarketplacePartners(req: Request, res: Response) {
    try {
      const { country } = req.query;
      const countryStr = typeof country === 'string' ? country : undefined;
      const profiles = await PartnerService.getMarketplaceProfiles(countryStr);
      
      res.status(200).json({
        success: true,
        data: profiles
      });
    } catch (error: any) {
      console.error('Error fetching marketplace partners:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to fetch marketplace partners' });
    }
  }

  static async getMarketplacePartnerDetail(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const profile = await PartnerService.getMarketplaceProfileDetail(userId as string);
      
      res.status(200).json({
        success: true,
        data: profile
      });
    } catch (error: any) {
      console.error('Error fetching marketplace partner detail:', error);
      res.status(404).json({ success: false, message: error.message || 'Failed to fetch marketplace partner detail' });
    }
  }
}
