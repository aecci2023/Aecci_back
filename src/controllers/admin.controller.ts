import { Response } from 'express';
import { prisma } from '../config/db.config';
import { AuthenticatedRequest } from '../middlewares/auth.middleware';

export const getAdminDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Build daily registration counts for the last 7 days
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      return d;
    });

    const [
      totalUsers,
      businessUsers,
      individualUsers,
      partners,
      pendingVerifications,
      activeSessions,
      completedSessions,
      activeSubscriptions,
      recentReports,
      recentVerifications,
      upcomingSessions,
      explorerCount,
      growthCount,
      marketEntryCount,
      enterpriseCount,
      recentSubscriptions,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'user' } }),
      prisma.user.count({ where: { role: 'user', userType: { in: ['business', 'Business'] } } }),
      prisma.user.count({ where: { role: 'user', userType: { in: ['individual', 'Individual'] } } }),
      prisma.user.count({ where: { role: 'partner' } }),
      prisma.user.count({ where: { role: 'user', kycStatus: 'pending_verification' } }),
      prisma.session.count({ where: { status: { in: ['upcoming', 'live', 'pending_approval'] } } }),
      prisma.session.count({ where: { status: 'completed' } }),
      prisma.user.count({ where: { role: 'user', planActive: true } }),
      prisma.opportunityReport.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          session: { select: { title: true, country: true } },
          user: { select: { fullName: true, companyName: true } },
        },
      }),
      prisma.user.findMany({
        where: { role: 'user', kycStatus: 'pending_verification' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          fullName: true,
          companyName: true,
          userType: true,
          email: true,
          kycStatus: true,
          iecDocument: true,
          gstDocument: true,
          panDocument: true,
          createdAt: true,
        },
      }),
      prisma.session.findMany({
        where: { status: { in: ['upcoming', 'pending_approval'] }, date: { gte: now } },
        orderBy: { date: 'asc' },
        take: 5,
        include: {
          partner: { select: { fullName: true, email: true } },
          client: { select: { fullName: true, companyName: true, email: true } },
        },
      }),
      prisma.user.count({ where: { role: 'user', planActive: true, planName: 'explorer' } }),
      prisma.user.count({ where: { role: 'user', planActive: true, planName: 'growth' } }),
      prisma.user.count({ where: { role: 'user', planActive: true, planName: 'market_entry' } }),
      prisma.user.count({ where: { role: 'user', planActive: true, planName: 'enterprise' } }),
      prisma.subscriptionPurchase.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { fullName: true, companyName: true, email: true } },
        },
      }),
    ]);

    // Daily registrations for last 7 days
    const registrationTrend = await Promise.all(
      days.map(async (dayStart) => {
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const count = await prisma.user.count({
          where: { role: 'user', createdAt: { gte: dayStart, lte: dayEnd } },
        });
        return {
          date: dayStart.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
          registrations: count,
        };
      })
    );

    const planDistribution = [
      { plan: 'Explorer', count: explorerCount },
      { plan: 'Growth', count: growthCount },
      { plan: 'Market Entry', count: marketEntryCount },
      { plan: 'Enterprise', count: enterpriseCount },
    ].filter((p) => p.count > 0);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalUsers,
          businessUsers,
          individualUsers,
          partners,
          pendingVerifications,
          activeSessions,
          completedSessions,
          activeSubscriptions,
        },
        recentVerifications,
        recentReports,
        upcomingSessions,
        registrationTrend,
        planDistribution,
        recentSubscriptions,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
};
