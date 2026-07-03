import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export class AuthController {
  async sendOtp(req: Request, res: Response) {
    try {
      const result = await authService.sendOtp(req.body);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      if (['User already exists', 'User already exists with this email', 'User already exists with this mobile number', 'Email is required'].includes(error.message)) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        console.error('Send OTP error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    }
  }

  async partnerSignup(req: Request, res: Response) {
    try {
      const result = await authService.partnerSignup(req.body);
      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error: any) {
      if (['Email and password are required', 'User already exists', 'Email not verified. Please verify OTP first.'].includes(error.message)) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        console.error('Partner signup error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    }
  }

  async importerSignup(req: Request, res: Response) {
    try {
      const result = await authService.importerSignup(req.body);
      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          sessionRegistration: result.sessionRegistration,
        },
      });
    } catch (error: any) {
      if (['Email and password are required', 'User already exists', 'Email not verified. Please verify OTP first.'].includes(error.message)) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        console.error('Importer signup error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    }
  }

  async signup(req: Request, res: Response) {
    try {
      const result = await authService.signup(req.body);

      res.status(201).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error: any) {
      if (['Email and password are required', 'User already exists'].includes(error.message)) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    }
  }

  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body);

      if (result.requiresOtp) {
        res.status(200).json({
          success: true,
          message: result.message,
          data: { requiresOtp: true },
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      });
    } catch (error: any) {
      if (['Email and password are required', 'Invalid credentials', 'Invalid or expired OTP', 'Application under review. We will notify you once approved.'].includes(error.message)) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    }
  }

  async verifyOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;
      if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required' });
      }
      const result = await authService.verifyOtp(email, otp);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      if (['No OTP request found for this email', 'Email is already verified', 'Invalid OTP', 'OTP has expired'].includes(error.message)) {
        res.status(400).json({ success: false, message: error.message });
      } else {
        console.error('Verify OTP error:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
      }
    }
  }

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      }

      const result = await authService.updateProfile(userId, req.body);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Update Profile error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, message: 'Refresh token is required' });
      }

      const result = await authService.refreshAccess(refreshToken);
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result,
      });
    } catch (error: any) {
      res.status(401).json({ success: false, message: error.message });
    }
  }
  async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;
      const result = await authService.forgotPassword(email);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async verifyResetOtp(req: Request, res: Response) {
    try {
      const { email, otp } = req.body;
      const result = await authService.verifyResetOtp(email, otp);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const { email, resetToken, newPassword } = req.body;
      const result = await authService.resetPassword(email, resetToken, newPassword);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

export const authController = new AuthController();
