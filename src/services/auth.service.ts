import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.config';
import { config } from '../config/config';
import { emailService } from './email.service';
import { redis } from '../config/redis.config';
import { emailQueue } from '../queues/email.queue';

export class AuthService {
  async sendOtp(userData: any): Promise<{ message: string }> {
    const { email, fullName } = userData;

    if (!email) {
      throw new Error('Email is required');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const cooldownKey = `otp_cooldown:${email}`;
    const isCooldown = await redis.get(cooldownKey);
    if (isCooldown) {
      throw new Error('Please wait 2 minutes before requesting another OTP');
    }

    const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in Redis (15 mins TTL)
    await redis.setex(`otp:${email}`, 900, emailOtp);
    
    // Set 2 minute cooldown
    await redis.setex(cooldownKey, 120, '1');

    await emailQueue.add('send-otp', {
      type: 'sendOTP',
      payload: { email, fullName: fullName || 'User', otp: emailOtp }
    });

    return { message: 'OTP sent to email' };
  }

  async signup(userData: any): Promise<{ user: any; accessToken: string; refreshToken: string; message: string }> {
    const { email, password, ...restData } = userData;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const verifiedKey = `otp_verified:${email}`;
    const isVerified = await redis.get(verifiedKey);
    
    if (!isVerified) {
      throw new Error('Email not verified. Please verify OTP first.');
    }

    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const payloadData = { ...restData };
    if (typeof payloadData.internationalBusinessIds === 'object') {
      payloadData.internationalBusinessIds = JSON.stringify(payloadData.internationalBusinessIds);
    }
    if (typeof payloadData.internationalKycIds === 'object') {
      payloadData.internationalKycIds = JSON.stringify(payloadData.internationalKycIds);
    }

    const arrayFields = [
      'products', 'targetMarkets', 'keyCertifications', 
      'expertiseAreas', 'sectorsOfInterest', 'languagesSpoken'
    ];
    
    for (const field of arrayFields) {
      if (typeof payloadData[field] === 'string') {
        payloadData[field] = payloadData[field].split(',').map((s: string) => s.trim()).filter(Boolean);
      }
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        isEmailVerified: true,
        ...payloadData,
      },
    });

    await emailQueue.add('registration-success', {
      type: 'sendRegistrationSubmitted',
      payload: { email: newUser.email, fullName: newUser.fullName || 'User', userId: newUser.id }
    });

    await redis.del(verifiedKey);

    const { accessToken, refreshToken } = this.generateTokens(newUser);
    const { password: _, ...userToReturn } = newUser;

    return { user: userToReturn, accessToken, refreshToken, message: 'Registration successful' };
  }

  async verifyOtp(email: string, otp: string): Promise<{ message: string }> {
    const storedOtp = await redis.get(`otp:${email}`);
    
    if (!storedOtp) throw new Error('No OTP request found for this email or OTP has expired');
    if (storedOtp !== otp) throw new Error('Invalid OTP');

    // Mark as verified for 1 hour
    await redis.setex(`otp_verified:${email}`, 3600, '1');
    await redis.del(`otp:${email}`);

    return { message: 'Email verified successfully' };
  }

  async updateProfile(userId: string, profileData: any): Promise<any> {
    const user = await prisma.user.update({
      where: { id: userId },
      data: profileData
    });
    
    // Send "Registration Successfully Submitted" email
    await emailService.sendRegistrationSubmitted(user.email, user.fullName || 'User', user.id);

    const { password: _, ...userToReturn } = user;
    return userToReturn;
  }

  async refreshAccess(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const secret = config.JWT_REFRESH_SECRET;
      const decoded: any = jwt.verify(refreshToken, secret);
      
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) throw new Error('User not found');
      
      const accessToken = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        config.JWT_ACCESS_SECRET,
        { expiresIn: '15m' }
      );
      
      return { accessToken };
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  async login(loginData: any): Promise<any> {
    const { email, password, otp } = loginData;

    if (!email || !password) {
      throw new Error('Email and password are required');
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      throw new Error('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    if (user.role === 'admin') {
      if (!otp) {
        const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await redis.setex(`admin_otp:${email}`, 300, emailOtp); // 5 mins
        
        // Log the OTP for easy local testing
        console.log(`\n========================================`);
        console.log(`🔐 ADMIN LOGIN OTP FOR ${email}: ${emailOtp}`);
        console.log(`========================================\n`);

        await emailQueue.add('send-otp', {
          type: 'sendOTP',
          payload: { email, fullName: user.fullName || 'Admin', otp: emailOtp }
        });
        return { requiresOtp: true, message: 'OTP sent to email for admin verification' };
      } else {
        const storedOtp = await redis.get(`admin_otp:${email}`);
        if (!storedOtp || storedOtp !== otp) {
          throw new Error('Invalid or expired OTP');
        }
        await redis.del(`admin_otp:${email}`);
      }
    }

    const { accessToken, refreshToken } = this.generateTokens(user);
    const { password: _, ...userToReturn } = user;

    return { user: userToReturn, accessToken, refreshToken, message: 'Login successful' };
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    if (!email) throw new Error('Email is required');

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new Error('No account found with this email');
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await redis.setex(`reset_otp:${email}`, 600, otp); // 10 mins

    // Log the OTP for easy local testing
    console.log(`\n========================================`);
    console.log(`🔑 PASSWORD RESET OTP FOR ${email}: ${otp}`);
    console.log(`========================================\n`);

    await emailQueue.add('send-otp', {
      type: 'sendOTP',
      payload: { email, fullName: user.fullName || 'User', otp }
    });

    return { success: true, message: 'Password reset OTP sent to your email' };
  }

  async verifyResetOtp(email: string, otp: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
    if (!email || !otp) throw new Error('Email and OTP are required');

    const storedOtp = await redis.get(`reset_otp:${email}`);
    if (!storedOtp || storedOtp !== otp) {
      throw new Error('Invalid or expired OTP');
    }

    await redis.del(`reset_otp:${email}`);
    
    // Generate a temporary reset token
    const resetToken = jwt.sign({ email }, config.JWT_ACCESS_SECRET, { expiresIn: '15m' });
    await redis.setex(`reset_token:${email}`, 900, resetToken); // 15 mins

    return { success: true, message: 'OTP verified successfully', resetToken };
  }

  async resetPassword(email: string, resetToken: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    if (!email || !resetToken || !newPassword) throw new Error('All fields are required');

    const storedToken = await redis.get(`reset_token:${email}`);
    if (!storedToken || storedToken !== resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    });

    await redis.del(`reset_token:${email}`);

    return { success: true, message: 'Password reset successfully' };
  }

  private generateTokens(user: any): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    );
    
    const refreshToken = jwt.sign(
      { id: user.id },
      config.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
