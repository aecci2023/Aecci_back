import { Request, Response } from 'express';
import { prisma } from '../config/db.config';

export const jobApplicationController = {
  async createJobApplication(req: Request, res: Response) {
    try {
      const { name, basicQualification, positionAppliedFor, address, phoneNumber, cvUrl } = req.body;

      if (!name || !basicQualification || !positionAppliedFor || !address || !phoneNumber || !cvUrl) {
        return res.status(400).json({
          status: 'error',
          message: 'All fields are required',
        });
      }

      const application = await prisma.jobApplication.create({
        data: {
          name,
          basicQualification,
          positionAppliedFor,
          address,
          phoneNumber,
          cvUrl,
        },
      });

      return res.status(201).json({
        status: 'success',
        message: 'Job application submitted successfully',
        data: application,
      });
    } catch (error: any) {
      console.error('Job Application Error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to submit job application',
        error: error.message,
      });
    }
  },

  async getAllJobApplications(req: Request, res: Response) {
    try {
      const applications = await prisma.jobApplication.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return res.status(200).json({
        status: 'success',
        data: applications,
      });
    } catch (error: any) {
      console.error('Get Job Applications Error:', error);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch job applications',
        error: error.message,
      });
    }
  },
};
