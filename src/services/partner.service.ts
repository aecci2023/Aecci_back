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

  // ─────────────────────────────────────────────────────────────
  // Deal Room Availability (date-wise discrete IST slots)
  // ─────────────────────────────────────────────────────────────

  // IST is a fixed offset of +05:30 with no DST, so we can convert an
  // IST wall-clock value to an absolute UTC instant arithmetically.
  private static readonly IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  // Partners open slots starting this many days ahead (IST), with no upper cap.
  static readonly AVAILABILITY_LEAD_DAYS = 15;

  /** Convert an IST "YYYY-MM-DD" + "HH:mm" into an absolute UTC Date. */
  private static istToUtc(date: string, time: string): Date {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    if ([y, m, d, hh, mm].some((n) => Number.isNaN(n))) {
      throw new Error(`Invalid date/time: ${date} ${time}`);
    }
    // Interpret the components as IST, then subtract the offset to get UTC.
    const asUtc = Date.UTC(y, m - 1, d, hh, mm, 0, 0);
    return new Date(asUtc - PartnerService.IST_OFFSET_MS);
  }

  /** IST "YYYY-MM-DD" for a given instant (defaults to now). */
  private static istDateString(instant: Date = new Date()): string {
    const ist = new Date(instant.getTime() + PartnerService.IST_OFFSET_MS);
    return ist.toISOString().slice(0, 10);
  }

  /** All of a partner's upcoming (not-yet-ended) slots, earliest first. */
  static async getAvailability(partnerId: string) {
    return await prisma.availabilitySlot.findMany({
      where: { partnerId, endsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      include: {
        bookedBy: { select: { id: true, fullName: true, email: true, country: true } },
      },
    });
  }

  /**
   * Replace a partner's future OPEN/BLOCKED slots with the supplied set.
   * Booked slots are always preserved. Slots must be at least
   * AVAILABILITY_LEAD_DAYS ahead (IST), with no upper cap.
   * Stamps availabilityConfiguredAt on first save.
   *
   * @param slots array of { date: "YYYY-MM-DD", startTime: "HH:mm", endTime: "HH:mm", status?, note? }
   */
  static async saveAvailability(
    partnerId: string,
    slots: Array<{ date: string; startTime: string; endTime: string; status?: string; note?: string }>
  ) {
    const now = new Date();
    // Earliest openable IST date = today + lead days.
    const minIst = PartnerService.istDateString(
      new Date(now.getTime() + PartnerService.AVAILABILITY_LEAD_DAYS * 24 * 60 * 60 * 1000)
    );

    // Validate + normalise incoming slots into DB rows.
    const seen = new Set<string>();
    const rows = (slots || []).map((s) => {
      if (!s.date || !s.startTime || !s.endTime) {
        throw new Error('Each slot needs a date, startTime and endTime');
      }
      if (s.date < minIst) {
        throw new Error(
          `Slot date ${s.date} is too soon — slots must be at least ${PartnerService.AVAILABILITY_LEAD_DAYS} days ahead (from ${minIst} IST onward)`
        );
      }
      const startsAt = PartnerService.istToUtc(s.date, s.startTime);
      const endsAt = PartnerService.istToUtc(s.date, s.endTime);
      const durationMinutes = Math.round((endsAt.getTime() - startsAt.getTime()) / 60000);
      if (durationMinutes <= 0) {
        throw new Error(`Slot on ${s.date} has an end time that is not after its start time`);
      }
      // Do not accept slots that have already started.
      if (startsAt.getTime() <= now.getTime()) {
        throw new Error(`Slot on ${s.date} at ${s.startTime} IST is in the past`);
      }
      const key = startsAt.toISOString();
      if (seen.has(key)) {
        throw new Error(`Duplicate slot at ${s.date} ${s.startTime} IST`);
      }
      seen.add(key);
      const status = s.status === 'blocked' ? 'blocked' : 'open';
      return {
        partnerId,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        startsAt,
        endsAt,
        durationMinutes,
        status,
        note: s.note ?? null,
      };
    });

    // Preserve booked slots — never delete or overwrite them.
    const bookedFuture = await prisma.availabilitySlot.findMany({
      where: { partnerId, status: 'booked', endsAt: { gte: now } },
      select: { startsAt: true },
    });
    const bookedInstants = new Set(bookedFuture.map((b) => b.startsAt.toISOString()));

    // Drop any incoming slot that collides with an existing booked instant.
    const rowsToCreate = rows.filter((r) => !bookedInstants.has(r.startsAt.toISOString()));

    // Replace future open/blocked slots, keep booked + past untouched.
    await prisma.$transaction([
      prisma.availabilitySlot.deleteMany({
        where: {
          partnerId,
          status: { in: ['open', 'blocked'] },
          endsAt: { gte: now },
        },
      }),
      ...(rowsToCreate.length
        ? [prisma.availabilitySlot.createMany({ data: rowsToCreate })]
        : []),
    ]);

    // Stamp the completion gate the first time slots are configured.
    const profile = await prisma.partnerProfile.findUnique({
      where: { userId: partnerId },
      select: { availabilityConfiguredAt: true },
    });
    if (profile && !profile.availabilityConfiguredAt) {
      await prisma.partnerProfile.update({
        where: { userId: partnerId },
        data: { availabilityConfiguredAt: now },
      });
    }

    return PartnerService.getAvailability(partnerId);
  }

  /** Public read of a partner's OPEN upcoming slots (for clients booking). */
  static async getPartnerOpenSlots(partnerId: string) {
    return await prisma.availabilitySlot.findMany({
      where: { partnerId, status: 'open', startsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true, date: true, startTime: true, endTime: true,
        startsAt: true, endsAt: true, durationMinutes: true, status: true,
      },
    });
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
