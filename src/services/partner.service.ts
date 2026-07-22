import { prisma } from '../config/db.config';

export class PartnerService {
  static async createApplication(userId: string, data: any) {
    // Ensure the user exists and isn't already a partner
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');
    if (user.role === 'partner') throw new Error('User is already a partner');

    // Create partner profile and set kyc status if needed
    const partnerProfile = await prisma.partnerProfile.create({
      data: {
        userId,
        organization: data.organization,
        expertiseCountries: data.expertiseCountries || [],
        expertiseSectors: data.expertiseSectors || [],
        motivation: data.motivation,
        governmentId: data.governmentId,
        professionalCert: data.professionalCert,
        businessProof: data.businessProof,
        references: data.references,
        status: 'pending_review',
      },
    });

    return partnerProfile;
  }

  static async getProfiles(status?: string) {
    const where = status ? { status } : {};
    return await prisma.partnerProfile.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            fullName: true, email: true, mobileNumber: true,
            country: true, nationality: true, professionalTitle: true,
            yearsOfExperience: true, languagesSpoken: true,
            linkedinProfileUrl: true, websiteUrl: true,
            profilePicture: true, applicationNumber: true,
            verificationStatus: true, createdAt: true,
          }
        }
      }
    });
  }

  static async getProfileByUserId(userId: string) {
    return await prisma.partnerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            fullName: true, email: true, mobileNumber: true,
            country: true, nationality: true, professionalTitle: true,
            yearsOfExperience: true, languagesSpoken: true,
            linkedinProfileUrl: true, websiteUrl: true,
            profilePicture: true, applicationNumber: true,
            verificationStatus: true, createdAt: true,
            companyName: true, countryCode: true,
          }
        }
      }
    });
  }

  static async updateStatus(userId: string, status: string, tier?: string, reason?: string) {
    const dataToUpdate: any = { status };
    if (tier) dataToUpdate.tier = tier;

    const { emailService } = await import('./email.service');
    const { emitToUser } = await import('./socket.service');

    // Fetch user for email + socket
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, fullName: true },
    });

    if (status === 'active') {
      // Approve: flip user role + verificationStatus
      await prisma.user.update({
        where: { id: userId },
        data: { role: 'partner', verificationStatus: 'active' },
      });

      if (user) {
        await emailService.sendVerificationApproved(user.email, user.fullName || 'Partner');
        emitToUser(userId, {
          title: 'Application Approved',
          message: 'Congratulations! Your partner application has been approved. You can now log in to your Partner Dashboard.',
          type: 'success',
          link: '/partner/dashboard',
          createdAt: new Date().toISOString(),
        });
      }
    } else if (status === 'suspended') {
      if (user) {
        await emailService.sendVerificationRejected(user.email, user.fullName || 'Applicant', reason || 'Your partner application did not meet our current requirements. Please contact support for more information.');
        emitToUser(userId, {
          title: 'Application Rejected',
          message: 'Your partner application was not approved at this time. Please check your email for details.',
          type: 'error',
          link: '/partner/register',
          createdAt: new Date().toISOString(),
        });
      }
    }

    return await prisma.partnerProfile.update({
      where: { userId },
      data: dataToUpdate,
    });
  }

  static async updateSetupInfo(userId: string, data: any) {
    const userFields = [
      'fullName', 'mobileNumber', 'countryCode', 'country', 'nationality',
      'professionalTitle', 'yearsOfExperience', 'languagesSpoken',
      'linkedinProfileUrl', 'websiteUrl', 'profilePicture'
    ];
    
    const userUpdateData: any = {};
    for (const field of userFields) {
      if (data[field] !== undefined) {
        userUpdateData[field] = data[field];
      }
    }

    if (Object.keys(userUpdateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData
      });
    }

    const profileFields = [
      'organization', 'bio', 'motivation', 'expertiseCountries', 
      'expertiseSectors', 'references', 'availability', 'signedAgreement'
    ];
    
    const profileUpdateData: any = {};
    for (const field of profileFields) {
      if (data[field] !== undefined) {
        profileUpdateData[field] = data[field];
      }
    }

    if (data.signedAgreement) {
      profileUpdateData.agreementDate = new Date();
    }

    if (Object.keys(profileUpdateData).length > 0) {
      return await prisma.partnerProfile.update({
        where: { userId },
        data: profileUpdateData
      });
    }

    return await prisma.partnerProfile.findUnique({ where: { userId } });
  }

  static async createPartnerManually(data: any) {
    const bcrypt = await import('bcrypt');
    const rawPassword = data.password || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        mobileNumber: data.mobileNumber,
        country: data.country,
        password: hashedPassword,
        role: 'partner',
        verificationStatus: 'active',
        isEmailVerified: true,
        userType: 'Individual', // Default for partners
      }
    });

    const partnerProfile = await prisma.partnerProfile.create({
      data: {
        userId: user.id,
        organization: data.organization,
        expertiseCountries: data.expertiseCountries || [],
        expertiseSectors: data.expertiseSectors || [],
        status: 'approved',
        tier: data.tier || 'Standard',
      }
    });

    return { user, partnerProfile };
  }

  static async getMarketplaceProfiles(country?: string) {
    const where: any = {
      status: { in: ['approved', 'active'] }
    };
    if (country) {
      where.expertiseCountries = { has: country };
    }

    return await prisma.partnerProfile.findMany({
      where,
      select: {
        id: true,
        userId: true,
        organization: true,
        expertiseCountries: true,
        expertiseSectors: true,
        tier: true,
        bio: true,
        availability: true,
        status: true,
        user: {
          select: {
            fullName: true,
            profilePicture: true,
            languagesSpoken: true,
            country: true,
            yearsOfExperience: true,
            professionalTitle: true
          }
        }
      }
    });
  }

  static async getMarketplaceProfileDetail(userId: string) {
    const profile = await prisma.partnerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        organization: true,
        expertiseCountries: true,
        expertiseSectors: true,
        tier: true,
        bio: true,
        availability: true,
        status: true,
        user: {
          select: {
            fullName: true,
            profilePicture: true,
            languagesSpoken: true,
            country: true,
            yearsOfExperience: true,
            professionalTitle: true
          }
        }
      }
    });

    if (!profile || !['approved', 'active'].includes(profile.status)) {
      throw new Error('Partner profile not found or inactive');
    }

    return profile;
  }
}
