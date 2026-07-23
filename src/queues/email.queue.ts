import { Queue, Worker } from 'bullmq';
import { redis } from '../config/redis.config';
import { emailService } from '../services/email.service';

export const emailQueue = new Queue('email-queue', { connection: redis as any });

const worker = new Worker('email-queue', async job => {
  const { type, payload } = job.data;

  switch (type) {
    case 'sendOTP':
      await emailService.sendOTP(payload.email, payload.fullName, payload.otp);
      break;

    case 'sendInterestSubmitted': {
      // Auto-reply goes to all roles EXCEPT collaborators (Partner / Collaborator category).
      const isCollaborator = String(payload.role || '').trim().toLowerCase() === 'partner';
      if (!isCollaborator) {
        await emailService.sendInterestSubmitted(payload.email, payload.fullName);
      }
      // Admin notification still fires for every submission, including collaborators.
      if (payload.role) {
        await emailService.sendInterestAdminNotification(payload.email, payload.fullName, payload.role);
      }
      break;
    }

    case 'sendRegistrationSubmitted':
      await emailService.sendRegistrationSubmitted(payload.email, payload.fullName, payload.userId);
      break;

    case 'sendSessionApproved':
      await emailService.sendSessionConfirmation(
        payload.email,
        payload.fullName,
        payload.country,
        payload.dateStr,
        payload.timeStr,
        payload.meetingLink,
        payload.icsContent
      );
      break;

    case 'sendSessionReminder24h':
      await Promise.all([
        emailService.sendTwentyFourHourReminder(payload.clientEmail, payload.clientName),
        emailService.sendTwentyFourHourReminder(payload.partnerEmail, payload.partnerName),
      ]);
      break;

    case 'sendSessionReminder30min':
      await Promise.all([
        emailService.sendSessionStartingNow(payload.clientEmail, payload.clientName, payload.meetingLink),
        emailService.sendSessionStartingNow(payload.partnerEmail, payload.partnerName, payload.meetingLink),
      ]);
      break;

    case 'sendAdminSummaryReady':
      await emailService.sendAdminSummaryReady(payload.sessionId, payload.sessionTitle, payload.partnerName);
      break;

    case 'sendPartnerWelcomeCredentials':
      await emailService.sendPartnerWelcomeCredentials(payload.email, payload.fullName, payload.password, payload.loginLink);
      break;

    default:
      console.warn(`Unknown email job type: ${type}`);
  }
}, { connection: redis as any });

worker.on('completed', job => {
  console.log(`Email job ${job.id} (${job.data.type}) completed`);
});

worker.on('failed', (job, err) => {
  console.error(`Email job ${job?.id} (${job?.data?.type}) failed: ${err.message}`);
});
