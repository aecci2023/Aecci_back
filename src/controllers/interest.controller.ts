import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { emailQueue } from '../queues/email.queue';

const prisma = new PrismaClient();

export const submitInterest = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const existingSubmission = await prisma.interestSubmission.findFirst({
      where: {
        OR: [
          { email: data.email },
          ...(data.emailAddress ? [{ emailAddress: data.emailAddress }] : []),
          ...(data.phoneWhatsapp ? [{ phoneWhatsapp: data.phoneWhatsapp }] : []),
          ...(data.contactPerson ? [{ contactPerson: data.contactPerson }] : [])
        ]
      }
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'Interest already submitted'
      });
    }

    // Also check if email is already registered as a User
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered. Please login instead.'
      });
    }

    const submission = await prisma.interestSubmission.create({
      data: {
        category: data.category,
        userType: data.userType,
        companyName: data.companyName,
        email: data.email,
        emailAddress: data.emailAddress,
        country: data.country,
        sector: data.sector,
        contactPerson: data.contactPerson,
        fullName: data.fullName,
        cityState: data.cityState,
        countryCode: data.countryCode,
        phoneWhatsapp: data.phoneWhatsapp,
        yourCountry: data.yourCountry,
        objectives: data.objectives || [],
        products: data.products,
        targetMarkets: data.targetMarkets,
        sourcingRequirements: data.sourcingRequirements,
        targetSourcingMarkets: data.targetSourcingMarkets,
        expertiseAreas: data.expertiseAreas,
        sectorsOfInterest: data.sectorsOfInterest,
        professionalTitle: data.professionalTitle,
        yearsOfExperience: data.yearsOfExperience,
        infoAccurate: data.infoAccurate || false,
        agreeTerms: data.agreeTerms || false,
        understandFacilitation: data.understandFacilitation || false,
        shareInfo: data.shareInfo || false,
      }
    });

    // Dispatch email
    await emailQueue.add('sendInterestEmail', {
      type: 'sendInterestSubmitted',
      payload: {
        email: submission.email,
        fullName: submission.fullName || submission.contactPerson || 'User',
        role: submission.category || 'Unknown',
      }
    });

    res.status(201).json({
      success: true,
      message: 'Interest submitted successfully',
      data: submission
    });
  } catch (error) {
    console.error('Error submitting interest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit interest',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getAllInterests = async (req: Request, res: Response) => {
  try {
    const interests = await prisma.interestSubmission.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({
      success: true,
      data: interests
    });
  } catch (error) {
    console.error('Error fetching interests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interests',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const getInterestById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const interest = await prisma.interestSubmission.findUnique({
      where: { id }
    });

    if (!interest) {
      return res.status(404).json({ success: false, message: 'Interest not found' });
    }

    res.status(200).json({
      success: true,
      data: interest
    });
  } catch (error) {
    console.error('Error fetching interest by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch interest details',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const updateInterestStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    const updatedInterest = await prisma.interestSubmission.update({
      where: { id },
      data: { status }
    });

    res.status(200).json({
      success: true,
      data: updatedInterest,
      message: 'Status updated successfully'
    });
  } catch (error) {
    console.error('Error updating interest status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update interest status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const approveInterest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const bcrypt = await import('bcrypt');
    const { config } = await import('../config/config');

    // Fetch interest submission
    const interest = await prisma.interestSubmission.findUnique({ where: { id } });
    if (!interest) {
      return res.status(404).json({ success: false, message: 'Interest not found' });
    }

    if (interest.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Interest is already approved' });
    }

    // Check if user already exists with this email
    const existingUser = await prisma.user.findUnique({ where: { email: interest.email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    // Generate password: first 4 letters of name + @123
    const name = interest.fullName || interest.contactPerson || interest.companyName || 'User';
    const nameLetters = name.replace(/[^a-zA-Z]/g, '').substring(0, 4).toLowerCase();
    const rawPassword = `${nameLetters}@123`;
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Create user with role 'partner'
    const newUser = await prisma.user.create({
      data: {
        email: interest.email,
        password: hashedPassword,
        fullName: interest.fullName || interest.contactPerson || null,
        companyName: interest.companyName || null,
        country: interest.country || interest.yourCountry || null,
        mobileNumber: interest.phoneWhatsapp || null,
        countryCode: interest.countryCode || null,
        professionalTitle: interest.professionalTitle || null,
        yearsOfExperience: interest.yearsOfExperience || null,
        expertiseAreas: interest.expertiseAreas ? [interest.expertiseAreas] : [],
        sectorsOfInterest: interest.sectorsOfInterest ? [interest.sectorsOfInterest] : [],
        isEmailVerified: true,
        role: 'partner',
        verificationStatus: 'active',
        userType: interest.userType || 'Individual',
        applicationNumber: `AECCI-PARTNER-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`,
      },
    });

    // Create partner profile
    await prisma.partnerProfile.create({
      data: {
        userId: newUser.id,
        organization: interest.companyName || '',
        expertiseCountries: interest.targetMarkets || [],
        expertiseSectors: interest.sectorsOfInterest ? [interest.sectorsOfInterest] : [],
        status: 'approved',
        tier: 'Standard',
      },
    });

    // Update interest status to approved
    await prisma.interestSubmission.update({
      where: { id },
      data: { status: 'approved' }
    });

    // Send welcome email with credentials
    const loginLink = `${config.FRONTEND_URL}/login`;
    await emailQueue.add('partner-welcome', {
      type: 'sendPartnerWelcomeCredentials',
      payload: {
        email: interest.email,
        fullName: name,
        password: rawPassword,
        loginLink,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Interest approved. Partner account created and credentials sent via email.',
      data: { userId: newUser.id, email: newUser.email }
    });
  } catch (error) {
    console.error('Error approving interest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve interest',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
