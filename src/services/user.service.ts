import { prisma } from '../config/db.config';

export class UserService {
  static async getUsers(filters: { role?: string; userType?: string; verificationStatus?: string }) {
    const { role, userType, verificationStatus } = filters;
    const where: any = {};

    if (role) where.role = role;
    if (userType) where.userType = userType;
    if (verificationStatus) where.verificationStatus = verificationStatus;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        fullName: true,
        country: true,
        mobileNumber: true,
        role: true,
        userType: true,
        companyName: true,
        verificationStatus: true,
        hasCompletedTour: true,
        iecDocument: true,
        gstDocument: true,
        panDocument: true,
        companyProfileDocument: true,
        uploadedFiles: true,
        isEmailVerified: true,
        createdAt: true,
        internationalBusinessIds: true,
        internationalIds: true,
        rejectionReason: true,
        websiteUrl: true,
        linkedinUrl: true,
        yearEstablished: true,
        companySize: true,
        turnover: true,
        industrySector: true,
        businessAddress: true,
        legalStructure: true,
        businessRole: true,
        products: true,
        targetMarkets: true,
        experience: true,
        objective: true,
        applicationNumber: true,
        planName: true,
        planActive: true,
        planExpiresAt: true,
        slotsTotal: true,
        slotsRemaining: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  static async getUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        country: true,
        mobileNumber: true,
        role: true,
        userType: true,
        companyName: true,
        verificationStatus: true,
        hasCompletedTour: true,
        iecDocument: true,
        gstDocument: true,
        panDocument: true,
        companyProfileDocument: true,
        uploadedFiles: true,
        isEmailVerified: true,
        createdAt: true,
        internationalBusinessIds: true,
        internationalIds: true,
        rejectionReason: true,
        websiteUrl: true,
        linkedinUrl: true,
        yearEstablished: true,
        companySize: true,
        turnover: true,
        industrySector: true,
        businessAddress: true,
        legalStructure: true,
        businessRole: true,
        products: true,
        targetMarkets: true,
        experience: true,
        objective: true,
        applicationNumber: true,
        planName: true,
        planActive: true,
        planExpiresAt: true,
        slotsTotal: true,
        slotsRemaining: true,
        nationality: true,
        professionalTitle: true,
        yearsOfExperience: true,
        languagesSpoken: true,
        profilePicture: true,
        partnerProfile: true,
      },
    });
    return user;
  }

  static async updateVerificationStatus(userId: string, verificationStatus: string, reason?: string) {
    const updateData: any = { verificationStatus };

    if (verificationStatus === 'rejected') {
      updateData.rejectionReason = reason;
    } else {
      updateData.rejectionReason = null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { emailService } = await import('./email.service');
    const { emitToUser } = await import('./socket.service');

    if (verificationStatus === 'approved') {
      await emailService.sendVerificationApproved(user.email, user.fullName || 'Valued Member');
      emitToUser(user.id, {
        title: 'Verification Approved',
        message: 'Your verification has been approved. You now have access to your dashboard.',
        type: 'success',
        link: '/dashboard',
        createdAt: new Date().toISOString(),
      });
    } else if (verificationStatus === 'rejected') {
      await emailService.sendVerificationRejected(user.email, user.fullName || 'Applicant', reason || 'Does not meet criteria.');
      emitToUser(user.id, {
        title: 'Verification Rejected',
        message: reason || 'Your application was not approved. Please check your email for details.',
        type: 'error',
        link: '/dashboard',
        createdAt: new Date().toISOString(),
      });
    }

    return user;
  }

  static async completeTour(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { hasCompletedTour: true },
    });
  }
}
