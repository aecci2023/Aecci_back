import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.config';
import { config } from '../config/config';
import { emailService } from './email.service';
import { redis } from '../config/redis.config';
import { emailQueue } from '../queues/email.queue';
import { smsService } from './sms.service';

export class AuthService {
  async sendOtp(userData: any): Promise<{ message: string }> {
    const { email, fullName, mobileNumber } = userData;

    if (!email) {
      throw new Error('Email is required');
    }

    const orConditions: any[] = [{ email }];
    if (mobileNumber) {
      orConditions.push({ mobileNumber });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: orConditions }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new Error('User already exists with this email');
      }
      if (existingUser.mobileNumber === mobileNumber) {
        throw new Error('User already exists with this mobile number');
      }
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

    // Log the OTP for easy local testing
    console.log(`\n========================================`);
    console.log(`🔐 REGISTRATION OTP FOR ${email}: ${emailOtp}`);
    console.log(`========================================\n`);

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

    this.validateOnboardingData(payloadData);

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
        applicationNumber: `AECCI-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
        ...payloadData,
      },
    });

    await emailQueue.add('registration-success', {
      type: 'sendRegistrationSubmitted',
      payload: { email: newUser.email, fullName: newUser.fullName || 'User', userId: newUser.id }
    });

    // Notify all connected admins about the new pending verification
    const { emitNewVerification } = await import('./socket.service');
    emitNewVerification({
      userId: newUser.id,
      fullName: newUser.fullName,
      companyName: newUser.companyName,
      userType: newUser.userType,
      createdAt: newUser.createdAt.toISOString(),
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

  // Fields users are allowed to update via self-service profile update
  private readonly ALLOWED_PROFILE_FIELDS = new Set([
    'fullName', 'countryCode', 'mobileNumber', 'country', 'companyName', 'referralSource',
    'iecNumber', 'gstNumber', 'panNumber', 'internationalBusinessIds',
    'websiteUrl', 'linkedinUrl', 'yearEstablished', 'companySize', 'turnover',
    'industrySector', 'businessAddress', 'legalStructure',
    'businessRole', 'products', 'targetMarkets', 'keyCertifications',
    'experience', 'objective',
    'professionalTitle', 'nationality', 'linkedinProfileUrl', 'yearsOfExperience',
    'aadharNumber', 'internationalIds', 'expertiseAreas', 'sectorsOfInterest',
    'languagesSpoken', 'businessAssociation',
    'profilePicture', 'iecDocument', 'gstDocument', 'panDocument',
    'companyProfileDocument', 'uploadedFiles',
    'resubmit',
  ]);

  async updateProfile(userId: string, profileData: any): Promise<any> {
    // Strip any fields the user must not be allowed to self-modify
    const sanitized: any = {};
    for (const key of Object.keys(profileData)) {
      if (this.ALLOWED_PROFILE_FIELDS.has(key)) {
        sanitized[key] = profileData[key];
      }
    }

    const isResubmit = Boolean(sanitized.resubmit);
    delete sanitized.resubmit;

    if (isResubmit) {
      this.validateOnboardingData({ ...sanitized, userType: profileData.userType, country: profileData.country });
      sanitized.verificationStatus = 'pending_verification';
      sanitized.rejectionReason = null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: sanitized,
    });

    // Only send the resubmission email when actually resubmitting
    if (isResubmit) {
      await emailService.sendRegistrationSubmitted(user.email, user.fullName || 'User', user.id);
    }

    const { password: _, ...userToReturn } = user;
    return userToReturn;
  }

  async partnerSignup(userData: any): Promise<{ user: any; accessToken: string; refreshToken: string; message: string }> {
    const { email, password, ...restData } = userData;

    if (!email || !password) throw new Error('Email and password are required');

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error('User already exists');

    const verifiedKey = `otp_verified:${email}`;
    const isVerified = await redis.get(verifiedKey);
    if (!isVerified) throw new Error('Email not verified. Please verify OTP first.');

    const hashedPassword = await bcrypt.hash(password, 10);

    // Split languagesSpoken if sent as comma string
    if (typeof restData.languagesSpoken === 'string') {
      restData.languagesSpoken = restData.languagesSpoken.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (typeof restData.expertiseCountries === 'string') {
      restData.expertiseCountries = restData.expertiseCountries.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (typeof restData.expertiseSectors === 'string') {
      restData.expertiseSectors = restData.expertiseSectors.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: restData.fullName,
        mobileNumber: restData.mobileNumber,
        countryCode: restData.countryCode,
        country: restData.country,
        nationality: restData.nationality,
        professionalTitle: restData.professionalTitle,
        yearsOfExperience: restData.yearsOfExperience,
        languagesSpoken: restData.languagesSpoken || [],
        linkedinProfileUrl: restData.linkedinProfileUrl || null,
        websiteUrl: restData.websiteUrl || null,
        profilePicture: restData.profilePicture || null,
        uploadedFiles: restData.uploadedFiles || [],
        isEmailVerified: true,
        role: 'partner',
        verificationStatus: 'pending_verification',
        applicationNumber: `AECCI-PARTNER-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });

    await prisma.partnerProfile.create({
      data: {
        userId: newUser.id,
        organization: restData.organization || '',
        expertiseCountries: restData.expertiseCountries || [],
        expertiseSectors: restData.expertiseSectors || [],
        bio: restData.bio || null,
        motivation: restData.motivation || null,
        references: restData.references || null,
        governmentId: restData.governmentId || null,
        professionalCert: restData.professionalCert || null,
        businessProof: restData.businessProof || null,
        status: 'pending_review',
      },
    });

    await emailQueue.add('registration-success', {
      type: 'sendRegistrationSubmitted',
      payload: { email: newUser.email, fullName: newUser.fullName || 'Partner', userId: newUser.id }
    });

    await redis.del(verifiedKey);

    const { accessToken, refreshToken } = this.generateTokens(newUser);
    const { password: _, ...userToReturn } = newUser;

    return { user: userToReturn, accessToken, refreshToken, message: 'Partner registration submitted successfully' };
  }

  async importerSignup(userData: any): Promise<{ user: any; accessToken: string; refreshToken: string; message: string; sessionRegistration?: any }> {
    const { email, password, sessionId, ...restData } = userData;

    if (!email || !password) throw new Error('Email and password are required');

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new Error('User already exists');

    const verifiedKey = `otp_verified:${email}`;
    const isVerified = await redis.get(verifiedKey);
    if (!isVerified) throw new Error('Email not verified. Please verify OTP first.');

    const hashedPassword = await bcrypt.hash(password, 10);

    if (typeof restData.products === 'string') {
      restData.products = restData.products.split(',').map((s: string) => s.trim()).filter(Boolean);
    }
    if (typeof restData.targetMarkets === 'string') {
      restData.targetMarkets = restData.targetMarkets.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName: restData.fullName,
        mobileNumber: restData.mobileNumber,
        countryCode: restData.countryCode,
        country: restData.country,
        companyName: restData.companyName,
        professionalTitle: restData.professionalTitle,
        businessRole: restData.businessRole ? [restData.businessRole] : [],
        importVolume: restData.importVolume,
        products: restData.products || [],
        targetMarkets: restData.targetMarkets || [],
        referralSource: restData.referralSource || null,
        isEmailVerified: true,
        role: 'importer',
        verificationStatus: 'approved',
        slotsTotal: 3,
        slotsRemaining: 3,
        applicationNumber: `AECCI-IMP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });

    let sessionRegistration = null;

    if (sessionId) {
       const session = await prisma.session.findUnique({ where: { id: sessionId } });
       if (session) {
         sessionRegistration = await prisma.sessionRegistration.create({
           data: {
             userId: newUser.id,
             sessionId: session.id,
             paymentStatus: 'free_slot',
             paymentReference: `REF-${Math.floor(100000 + Math.random() * 900000)}`
           }
         });
         await prisma.user.update({
           where: { id: newUser.id },
           data: { slotsRemaining: 2 }
         });
       }
    }

    await emailQueue.add('registration-success', {
      type: 'sendRegistrationSubmitted',
      payload: { email: newUser.email, fullName: newUser.fullName || 'Importer', userId: newUser.id }
    });

    await redis.del(verifiedKey);

    const { accessToken, refreshToken } = this.generateTokens(newUser);
    const { password: _, ...userToReturn } = newUser;

    return { user: userToReturn, accessToken, refreshToken, message: 'Importer registration successful', sessionRegistration };
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
        { expiresIn: '1d' }
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

    /* TEMPORARY COMMENT ADMIN OTP
    if (user.role === 'admin') {
      if (!otp) {
        const emailOtp = Math.floor(100000 + Math.random() * 900000).toString();
        await redis.setex(`admin_otp:${email}`, 120, emailOtp); // 120 seconds per ROADMAP

        // Log the OTP for easy local testing
        console.log(`\n========================================`);
        console.log(`🔐 ADMIN LOGIN OTP FOR ${email}: ${emailOtp}`);
        console.log(`========================================\n`);

        await emailQueue.add('send-otp', {
          type: 'sendOTP',
          payload: { email, fullName: user.fullName || 'Admin', otp: emailOtp }
        });

        if (user.mobileNumber) {
          // Send SMS asynchronously to not block the request
          smsService.sendLoginOtpSms(user.mobileNumber, emailOtp).catch(err => {
            console.error('Failed to send admin login OTP SMS:', err);
          });
        }

        return { requiresOtp: true, message: 'OTP sent to email and SMS for admin verification' };
      } else {
        const storedOtp = await redis.get(`admin_otp:${email}`);
        if (!storedOtp || storedOtp !== otp) {
          throw new Error('Invalid or expired OTP');
        }
        await redis.del(`admin_otp:${email}`);
      }
    }
    */

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

  private validateOnboardingData(data: any) {
    const { userType, country, uploadedFiles, legalStructure, yearEstablished, companySize, turnover, industrySector, businessAddress } = data;

    const hasDocument = uploadedFiles && Array.isArray(uploadedFiles) && uploadedFiles.some((f: any) => f.type === 'document');

    if (!hasDocument) {
      throw new Error('At least one compliance document is required');
    }

    if (userType === 'business') {
      if (!legalStructure || !yearEstablished || !companySize || !turnover || !industrySector || !businessAddress) {
        throw new Error('Missing required business profile fields');
      }
      if (country !== 'India') {
        const ids = data.internationalBusinessIds;
        if (!ids || !Array.isArray(ids) || ids.length === 0 || !ids.some((id: any) => id.type && id.idNumber)) {
          throw new Error('International businesses must provide at least one International Business ID');
        }
      }
    } else if (userType === 'individual') {
      if (country !== 'India') {
        const ids = data.internationalIds;
        if (!ids || !Array.isArray(ids) || ids.length === 0 || !ids.some((id: any) => id.type && id.idNumber)) {
          throw new Error('International individuals must provide at least one International ID');
        }
      }
    }
  }

  private generateTokens(user: any): { accessToken: string; refreshToken: string } {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      config.JWT_ACCESS_SECRET,
      { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      config.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    return { accessToken, refreshToken };
  }
}

export const authService = new AuthService();
