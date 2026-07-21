export const emailTemplates = {
  // --- CORE FUNCTIONAL TEMPLATES (Not in Master Flow but required for auth) ---
  otpEmail: (name: string, otp: string) => ({
    subject: "Your AECCI Global Deal Room Registration OTP",
    text: `Dear ${name},

Your OTP for AECCI Global Deal Room registration is:

${otp}

This OTP is valid for 15 minutes. Please do not share it with anyone.

If you did not request this OTP, you may safely ignore this email.

Regards,
AECCI Global Deal Room Team`,
  }),

  verificationApproved: (name: string) => ({
    subject: "Verification Successful – AECCI Global Deal Room",
    text: `Dear ${name},

We are pleased to inform you that your verification is complete and your application has been approved.

Our team will now proceed with evaluating your requirements and assigning the appropriate partner and deal room.

Regards,
AECCI Screening Desk`,
  }),

  verificationRejected: (name: string, reason: string) => ({
    subject: "Update on Your Registration – AECCI Global Deal Room",
    text: `Dear ${name},

Thank you for your interest in the AECCI Global Deal Room. After reviewing your submitted documents, we are unable to approve your application at this time.

Reason: ${reason}

If you have any questions or wish to submit updated documentation, please contact our support team.

Regards,
AECCI Screening Desk`,
  }),

  // --- MASTER EMAIL FLOW ---
  
  // 1. New Enquiry Received
  newEnquiryReceived: (name: string) => ({
    subject: "Thank You for Your Interest in AECCI Global Deal Room",
    text: `Dear ${name},

Thank you for contacting the Asian Exporters Chamber of Commerce and Industry (AECCI).

We are pleased to learn about your interest in the AECCI Global Deal Room.

Our team will shortly review your requirements and guide you regarding the most suitable country access session.

For any immediate assistance, please contact our Deal Room Support Team.

Regards,
AECCI Global Deal Room Team`,
  }),

  // Interest Submitted
  interestSubmitted: (name: string) => ({
    subject: "Interest Submitted – AECCI Global Deal Room",
    text: `Dear ${name},

Thank you for submitting your interest in the AECCI Global Deal Room.

You will be notified when Global Connect is open, and then you will be able to log in.

Regards,
AECCI Global Deal Room Team`,
  }),

  // Admin Notification for New Interest
  interestAdminNotification: (name: string, email: string, role: string) => ({
    subject: `New Interest Submitted: ${role}`,
    text: `A new interest form has been submitted on the AECCI Global Deal Room platform.

Details:
Name: ${name}
Email: ${email}
Category: ${role}

Please log in to the admin panel to view the complete submission details.

Regards,
System Notification`,
  }),

  // EMAIL 2
  registrationInvitation: (name: string, registrationLink: string) => ({
    subject: "Complete Your Registration – AECCI Global Deal Room",
    text: `Dear ${name},

We invite you to complete your registration for the AECCI Global Deal Room.

Registration includes:

• Company Profile Submission
• Product Information
• Export Readiness Assessment
• Target Market Selection

Start Registration:
${registrationLink}

Regards,
AECCI Registration Desk`,
  }),

  // EMAIL 3
  registrationSuccessful: (name: string, referenceId: string) => ({
    subject: "Registration Successfully Submitted",
    text: `Dear ${name},

Thank you for submitting your registration.

Your application has been received and is currently under screening review.

Reference Number:
${referenceId}

Our team will notify you regarding the next steps.

Regards,
AECCI Screening Team`,
  }),

  // EMAIL 4
  screeningUnderReview: (name: string) => ({
    subject: "Application Under Review",
    text: `Dear ${name},

Your application is currently being reviewed by our screening team.

This process helps ensure relevant participation and quality business discussions.

We appreciate your patience.

Regards,
AECCI Screening Desk`,
  }),

  // EMAIL 5
  applicationApproved: (name: string, countryName: string, paymentLink: string) => ({
    subject: "Congratulations – Application Approved",
    text: `Dear ${name},

We are pleased to inform you that your application has been approved.

You may now proceed with slot confirmation and payment.

Session:
${countryName}

Complete Payment:
${paymentLink}

Regards,
AECCI Deal Room Operations`,
  }),

  // EMAIL 6
  paymentReminder: (name: string) => ({
    subject: "Reminder – Confirm Your Deal Room Seat",
    text: `Dear ${name},

Your application has been approved.

To secure your reserved seat, please complete payment before the registration deadline.

Seats are allocated on a first-confirmed basis.

Regards,
AECCI Accounts Team`,
  }),

  // EMAIL 7
  paymentSuccess: (name: string, invoice: string, paymentId: string) => ({
    subject: "Payment Successfully Received",
    text: `Dear ${name},

Thank you.

Your payment has been successfully received.

Your Deal Room participation is now confirmed.

Invoice Number:
${invoice}

Payment Reference:
${paymentId}

Regards,
AECCI Accounts Department`,
  }),

  // EMAIL 8
  sessionConfirmation: (name: string, country: string, date: string, time: string) => ({
    subject: "Your Deal Room Session Has Been Confirmed",
    text: `Dear ${name},

Your participation has been officially confirmed.

Country Session:
${country}

Date:
${date}

Time:
${time}

Further instructions will be shared shortly.

Regards,
AECCI Operations Team`,
  }),

  // EMAIL 9
  countryBriefAvailable: (name: string, downloadLink: string) => ({
    subject: "Country Market Brief Available",
    text: `Dear ${name},

Your country briefing document is now available.

Please review the information before attending the session.

Download:
${downloadLink}

Regards,
AECCI Research Desk`,
  }),

  // EMAIL 10
  partnerProfileShared: (name: string) => ({
    subject: "Collaboration Partner Information",
    text: `Dear ${name},

We are pleased to share the profile of the collaboration partner participating in your upcoming session.

Please review the information before the meeting.

Regards,
AECCI International Relations Desk`,
  }),

  // EMAIL 11
  twentyFourHourReminder: (name: string) => ({
    subject: "Reminder – Your Session Starts Tomorrow",
    text: `Dear ${name},

This is a reminder regarding your upcoming AECCI Global Deal Room session.

Please ensure:

• Stable internet connection
• Company introduction ready
• Product details available

Regards,
AECCI Operations Team`,
  }),

  // EMAIL 12
  meetingAccess: (name: string, meetingLink: string) => ({
    subject: "Meeting Access Details",
    text: `Dear ${name},

Your Deal Room access details are now available.

Join Session:
${meetingLink}

Please join at least 15 minutes before the scheduled start time.

Regards,
AECCI Session Desk`,
  }),

  // EMAIL 13
  sessionStartingNow: (name: string, meetingLink: string) => ({
    subject: "Your AECCI Session Is Starting",
    text: `Dear ${name},

Your Deal Room session is about to begin.

Join Now:
${meetingLink}

Regards,
AECCI Moderator Team`,
  }),

  // EMAIL 14
  thankYouForAttending: (name: string) => ({
    subject: "Thank You for Participating",
    text: `Dear ${name},

Thank you for participating in the AECCI Global Deal Room.

We hope the session provided valuable market insights and opportunities for future growth.

Regards,
AECCI Global Deal Room Team`,
  }),

  // EMAIL 15
  opportunityReport: (name: string, reportLink: string) => ({
    subject: "Your Opportunity Summary Report",
    text: `Dear ${name},

Your session opportunity report is now available.

Download:
${reportLink}

Please review the recommendations and suggested next steps.

Regards,
AECCI Research & Advisory Team`,
  }),

  // EMAIL 16
  followUpServices: (name: string) => ({
    subject: "Next Steps for Market Expansion",
    text: `Dear ${name},

AECCI offers additional services including:

• Market Entry Support
• Partner Coordination
• Documentation Assistance
• Advisory Services

If you would like further assistance, please contact us.

Regards,
AECCI Advisory Desk`,
  }),

  // EMAIL 17
  feedbackRequest: (name: string) => ({
    subject: "Share Your Feedback",
    text: `Dear ${name},

Your feedback helps us improve future Deal Room sessions.

Please take a few minutes to complete our feedback survey.

Regards,
AECCI Quality Team`,
  }),

  // EMAIL 18
  sessionRescheduled: (name: string) => ({
    subject: "Important Update Regarding Your Session",
    text: `Dear ${name},

Your session has been rescheduled.

Your participation remains confirmed and your seat remains reserved.

Updated details will be shared shortly.

Regards,
AECCI Operations Team`,
  }),

  // EMAIL 19
  partnerNoShow: (name: string) => ({
    subject: "Session Update",
    text: `Dear ${name},

Due to unforeseen circumstances, the collaboration partner was unable to attend the scheduled session.

AECCI is coordinating alternative arrangements and will update you shortly.

Thank you for your understanding.

Regards,
AECCI Operations Team`,
  }),

  // EMAIL 20
  clientSupportClosure: (name: string) => ({
    subject: "AECCI Support Ticket Closed",
    text: `Dear ${name},

We believe your request has been successfully resolved.

Should you require any further assistance, please feel free to contact our support team.

Thank you for choosing AECCI.

Regards,
AECCI Customer Support Team`,
  }),
};
