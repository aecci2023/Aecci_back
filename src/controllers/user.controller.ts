import { Request, Response } from 'express';
import { UserService } from '../services/user.service';

export class UserController {
  static async getUsers(req: Request, res: Response) {
    try {
      const { role, userType, verificationStatus } = req.query;

      const filters = {
        role: role as string,
        userType: userType as string,
        verificationStatus: verificationStatus as string,
      };

      const users = await UserService.getUsers(filters);

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
  }

  static async getUserById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const requestingUserId = (req as any).user?.id;
      const role = (req as any).user?.role;
      
      if (role !== 'admin' && requestingUserId !== id) {
        return res.status(403).json({ success: false, message: 'Forbidden: You can only access your own profile data.' });
      }
      const user = await UserService.getUserById(id as string);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
  }

  static async updateVerificationStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { verificationStatus, reason } = req.body;

      // Only the canonical statuses defined in ROADMAP
      const allowedStatuses = ['pending_verification', 'approved', 'active', 'rejected'];
      if (!allowedStatuses.includes(verificationStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid verificationStatus' });
      }

      if (verificationStatus === 'rejected' && !reason) {
        return res.status(400).json({ success: false, message: 'Reason is required for rejection' });
      }

      const updatedUser = await UserService.updateVerificationStatus(id as string, verificationStatus, reason);

      res.status(200).json({
        success: true,
        message: `User verification status updated to ${verificationStatus}`,
        data: updatedUser,
      });
    } catch (error) {
      console.error('Error updating verification status:', error);
      res.status(500).json({ success: false, message: 'Failed to update verification status' });
    }
  }

  static async completeTour(req: Request, res: Response) {
    try {
      const requestingUserId = (req as any).user?.id;
      if (!requestingUserId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      await UserService.completeTour(requestingUserId);

      res.status(200).json({
        success: true,
        message: 'Tour marked as completed',
      });
    } catch (error) {
      console.error('Error completing tour:', error);
      res.status(500).json({ success: false, message: 'Failed to complete tour' });
    }
  }
}
