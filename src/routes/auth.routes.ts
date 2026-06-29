import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many requests. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/send-otp', otpLimiter, authController.sendOtp);
router.post('/signup', authLimiter, authController.signup);
router.post('/partner-signup', authLimiter, authController.partnerSignup);
router.post('/login', authLimiter, authController.login);
router.post('/verify-otp', otpLimiter, authController.verifyOtp);
router.post('/refresh-token', authLimiter, authController.refreshToken);
router.patch('/profile', authenticate, authController.updateProfile);

// Forgot Password routes
router.post('/forgot-password', otpLimiter, authController.forgotPassword);
router.post('/verify-reset-otp', otpLimiter, authController.verifyResetOtp);
router.post('/reset-password', authLimiter, authController.resetPassword);

export default router;
