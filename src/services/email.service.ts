import nodemailer from 'nodemailer';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';
import { config } from '../config/config';
import { emailTemplates } from '../utils/emailTemplates';

const sesClient = new SESv2Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

const transporter = nodemailer.createTransport({
  SES: { sesClient, SendEmailCommand },
});

export class EmailService {
  private async sendMail(to: string, subject: string, text: string) {
    if (!config.AWS_SES_SENDER_EMAIL) {
      console.warn('AWS_SES_SENDER_EMAIL is not set. Skipping email send.');
      console.log(`[Mock Email intended for ${to}]\nSubject: ${subject}\n\n${text}`);
      return;
    }

    try {
      await transporter.sendMail({
        from: config.AWS_SES_SENDER_EMAIL,
        to,
        subject,
        text,
      });
      console.log(`Email successfully sent to ${to}`);
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

  // --- CORE AUTH / COMPATIBILITY FUNCTIONS ---
  async sendOTP(email: string, name: string, otp: string) {
    const template = emailTemplates.otpEmail(name, otp);
    await this.sendMail(email, template.subject, template.text);
  }

  async sendVerificationApproved(email: string, name: string) {
    const template = emailTemplates.verificationApproved(name);
    await this.sendMail(email, template.subject, template.text);
  }

  async sendVerificationRejected(email: string, name: string, reason: string) {
    const template = emailTemplates.verificationRejected(name, reason);
    await this.sendMail(email, template.subject, template.text);
  }

  // Alias for backward compatibility
  async sendRegistrationSubmitted(email: string, name: string, referenceId: string) {
    await this.sendRegistrationSuccessful(email, name, referenceId);
  }

  // --- MASTER EMAIL FLOW FUNCTIONS ---
  // 1. New Enquiry Received
  async sendNewEnquiryReceived(email: string, name: string) {
    const template = emailTemplates.newEnquiryReceived(name);
    await this.sendMail(email, template.subject, template.text);
  }

  // Interest Submitted
  async sendInterestSubmitted(email: string, name: string) {
    const template = emailTemplates.interestSubmitted(name);
    await this.sendMail(email, template.subject, template.text);
  }

  // 2. Registration Invitation
  async sendRegistrationInvitation(email: string, name: string, registrationLink: string) {
    const template = emailTemplates.registrationInvitation(name, registrationLink);
    await this.sendMail(email, template.subject, template.text);
  }

  // 3. Registration Successful
  async sendRegistrationSuccessful(email: string, name: string, referenceId: string) {
    const template = emailTemplates.registrationSuccessful(name, referenceId);
    await this.sendMail(email, template.subject, template.text);
  }

  // 4. Screening Under Review
  async sendScreeningUnderReview(email: string, name: string) {
    const template = emailTemplates.screeningUnderReview(name);
    await this.sendMail(email, template.subject, template.text);
  }

  // 5. Application Approved
  async sendApplicationApproved(email: string, name: string, countryName: string, paymentLink: string) {
    const template = emailTemplates.applicationApproved(name, countryName, paymentLink);
    await this.sendMail(email, template.subject, template.text);
  }

  // 6. Payment Reminder
  async sendPaymentReminder(email: string, name: string) {
    const template = emailTemplates.paymentReminder(name);
    await this.sendMail(email, template.subject, template.text);
  }

  // 7. Payment Success
  async sendPaymentSuccess(email: string, name: string, invoice: string, paymentId: string) {
    const template = emailTemplates.paymentSuccess(name, invoice, paymentId);
    await this.sendMail(email, template.subject, template.text);
  }

  // 8. Session Confirmation (with optional ICS attachment)
  async sendSessionConfirmation(
    email: string,
    name: string,
    country: string,
    date: string,
    time: string,
    meetingLink?: string,
    icsContent?: string
  ) {
    const template = emailTemplates.sessionConfirmation(name, country, date, time);

    if (!config.AWS_SES_SENDER_EMAIL) {
      console.log(`[Mock Email → ${email}] ${template.subject}`);
      return;
    }

    const attachments: any[] = [];
    if (icsContent) {
      attachments.push({
        filename: 'session.ics',
        content: Buffer.from(icsContent),
        contentType: 'text/calendar',
      });
    }

    const mailOptions: any = {
      from: config.AWS_SES_SENDER_EMAIL,
      to: email,
      subject: template.subject,
      text: meetingLink ? `${template.text}\n\nJoin Room: ${meetingLink}` : template.text,
    };

    if (attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Session confirmation email sent to ${email}`);
    } catch (error) {
      console.error('Error sending session confirmation email:', error);
    }
  }

  async sendAdminSummaryReady(sessionId: string, sessionTitle: string, partnerName: string) {
    if (!config.AWS_SES_SENDER_EMAIL) {
      console.log(`[Mock Email - Admin] Post-session summary ready for session ${sessionId}`);
      return;
    }
    try {
      await transporter.sendMail({
        from: config.AWS_SES_SENDER_EMAIL,
        to: config.AWS_SES_SENDER_EMAIL, // notify the admin inbox
        subject: `[Action Required] Post-Session Summary Ready — ${sessionTitle}`,
        text: `Partner ${partnerName} has submitted the post-session summary for:\n\nSession: ${sessionTitle}\nSession ID: ${sessionId}\n\nPlease log in to the Admin portal to generate and upload the Opportunity Report.\n\nRegards,\nAECCI Platform`,
      });
    } catch (error) {
      console.error('Error sending admin summary ready email:', error);
    }
  }

  // 9. Country Brief Available
  async sendCountryBriefAvailable(email: string, name: string, downloadLink: string) {
    const template = emailTemplates.countryBriefAvailable(name, downloadLink);
    await this.sendMail(email, template.subject, template.text);
  }

  // 10. Partner Profile Shared
  async sendPartnerProfileShared(email: string, name: string) {
    const template = emailTemplates.partnerProfileShared(name);
    await this.sendMail(email, template.subject, template.text);
  }

  // 11. 24-Hour Reminder
  async sendTwentyFourHourReminder(email: string, name: string) {
    const template = emailTemplates.twentyFourHourReminder(name);
    await this.sendMail(email, template.subject, template.text);
  }

  // 12. Meeting Access
  async sendMeetingAccess(email: string, name: string, meetingLink: string) {
    const template = emailTemplates.meetingAccess(name, meetingLink);
    await this.sendMail(email, template.subject, template.text);
  }

  // 13. Session Starting Now
  async sendSessionStartingNow(email: string, name: string, meetingLink: string) {
    const template = emailTemplates.sessionStartingNow(name, meetingLink);
    await this.sendMail(email, template.subject, template.text);
  }

  // 14. Thank You For Attending
  async sendThankYouForAttending(email: string, name: string) {
    const template = emailTemplates.thankYouForAttending(name);
    await this.sendMail(email, template.subject, template.text);
  }

  // 15. Opportunity Report
  async sendOpportunityReport(email: string, name: string, reportLink: string) {
    const template = emailTemplates.opportunityReport(name, reportLink);
    await this.sendMail(email, template.subject, template.text);
  }

  // 16. Follow Up Services
  async sendFollowUpServices(email: string, name: string) {
    const template = emailTemplates.followUpServices(name);
    await this.sendMail(email, template.subject, template.text);
  }

  // 17. Feedback Request
  async sendFeedbackRequest(email: string, name: string) {
    const template = emailTemplates.feedbackRequest(name);
    await this.sendMail(email, template.subject, template.text);
  }

  // 18. Session Rescheduled
  async sendSessionRescheduled(email: string, name: string) {
    const template = emailTemplates.sessionRescheduled(name);
    await this.sendMail(email, template.subject, template.text);
  }

  // 19. Partner No Show
  async sendPartnerNoShow(email: string, name: string) {
    const template = emailTemplates.partnerNoShow(name);
    await this.sendMail(email, template.subject, template.text);
  }

  // 20. Client Support Closure
  async sendClientSupportClosure(email: string, name: string) {
    const template = emailTemplates.clientSupportClosure(name);
    await this.sendMail(email, template.subject, template.text);
  }
}

export const emailService = new EmailService();
