import { config } from "../config/config";

const TECHMORE_API_URL = "http://textsms.thetechmore.in/http-tokenkeyapi.php";

function formatPhoneForTechMore(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+91")) return cleaned.substring(3);
  if (/^91[0-9]{10}$/.test(cleaned)) return cleaned.substring(2);
  if (/^[0-9]{10}$/.test(cleaned)) return cleaned;
  return cleaned;
}

async function sendSMS(phone: string, message: string): Promise<boolean> {
  try {
    console.log("\n========== SMS SEND ATTEMPT ==========");
    console.log(`[SMS] Target Phone: ${phone}`);

    const formattedPhone = formatPhoneForTechMore(phone);

    if (!/^[0-9]{10}$/.test(formattedPhone)) {
      console.error(`[SMS] ❌ Invalid phone number format: ${phone}`);
      return false;
    }

    if (!config.TECHMORE_AUTH_KEY || !config.TECHMORE_SENDER_ID || !config.TECHMORE_ROUTE) {
      console.error(`[SMS] ❌ TechMore configuration missing in .env`);
      return false;
    }

    const params = new URLSearchParams({
      "authentic-key": config.TECHMORE_AUTH_KEY,
      senderid: config.TECHMORE_SENDER_ID,
      route: config.TECHMORE_ROUTE,
      number: formattedPhone,
      message,
    });

    if (config.TECHMORE_TEMPLATE_ID) {
      params.append("templateid", config.TECHMORE_TEMPLATE_ID);
    }

    console.log(`[SMS] Request Details:`);
    console.log(`[SMS] Phone: ${formattedPhone}`);
    console.log(`[SMS] Sender ID: ${config.TECHMORE_SENDER_ID}`);
    console.log(`[SMS] Sending OTP SMS...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${TECHMORE_API_URL}?${params.toString()}`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();
    console.log(`[SMS] Response Status Code: ${response.status}`);
    
    if (response.ok && data?.Status === "Success") {
      console.log(`[SMS] ✅ SMS sent successfully. Message ID: ${data["Message-Id"]}`);
      console.log("========== SMS SEND SUCCESS ==========\n");
      return true;
    }

    console.error(`[SMS] ❌ TechMore API error: ${data?.Description || "Unknown error"}`);
    console.log("========== SMS SEND FAILED ==========\n");
    return false;
  } catch (error: any) {
    console.error(`[SMS] ❌ Exception while sending SMS: ${error.message}`);
    return false;
  }
}

export const smsService = {
  async sendLoginOtpSms(phone: string, otp: string): Promise<boolean> {
    const message = `Your OTP  is ${otp}. It is valid for 10 minutes. 
Please do not share this code with anyone.

AECCI

TMS `;

    try {
      const success = await sendSMS(phone, message);
      if (success) {
        console.log(`[SMS] Login OTP sent to ${phone}`);
      } else {
        console.error(`[SMS] Failed to send login OTP to ${phone}`);
      }
      return success;
    } catch (error: any) {
      console.error(`[SMS] Error sending login OTP to ${phone}: ${error.message}`);
      return false;
    }
  },
};
