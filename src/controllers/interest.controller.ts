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
