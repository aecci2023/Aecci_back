import { prisma } from '../config/db.config';

export class UserService {
  static async getUsers(filters: { role?: string; userType?: string; kycStatus?: string }) {
    const { role, userType, kycStatus } = filters;
    const where: any = {};

    if (role) where.role = role;
    if (userType) where.userType = userType;
    if (kycStatus) where.kycStatus = kycStatus;

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
        kycStatus: true,
        iecDocument: true,
        gstDocument: true,
        panDocument: true,
        companyProfileDocument: true,
        productCatalogue: true,
        documents: true,
        isEmailVerified: true,
        createdAt: true,
        internationalBusinessIds: true,
        internationalKycIds: true,
        kycRejectionReason: true,
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
        kycStatus: true,
        iecDocument: true,
        gstDocument: true,
        panDocument: true,
        companyProfileDocument: true,
        productCatalogue: true,
        documents: true,
        isEmailVerified: true,
        createdAt: true,
        internationalBusinessIds: true,
        internationalKycIds: true,
        kycRejectionReason: true,
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
    });
    return user;
  }

  static async updateKycStatus(userId: string, kycStatus: string, reason?: string) {
    const updateData: any = { kycStatus };

    if (kycStatus === 'rejected') {
      updateData.kycRejectionReason = reason;
    } else {
      updateData.kycRejectionReason = null;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const { emailService } = await import('./email.service');
    const { emitToUser } = await import('./socket.service');

    if (kycStatus === 'approved') {
      await emailService.sendKycApproved(user.email, user.fullName || 'Valued Member');
      emitToUser(user.id, {
        title: 'KYC Approved',
        message: 'Your KYC verification has been approved. You now have access to your dashboard.',
        type: 'success',
        link: '/dashboard',
        createdAt: new Date().toISOString(),
      });
    } else if (kycStatus === 'rejected') {
      await emailService.sendKycRejected(user.email, user.fullName || 'Applicant', reason || 'Does not meet criteria.');
      emitToUser(user.id, {
        title: 'KYC Rejected',
        message: reason || 'Your KYC application was not approved. Please check your email for details.',
        type: 'error',
        link: '/dashboard',
        createdAt: new Date().toISOString(),
      });
    }

    return user;
  }
}
