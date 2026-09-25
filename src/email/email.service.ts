import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;

  // Sender address. Resend's test sender works without a verified domain,
  // but can only deliver to the Resend account owner's email.
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    this.resend = new Resend(apiKey);

    this.from =
      this.configService.get<string>('EMAIL_FROM') || 'onboarding@resend.dev';
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ) {
    const { data, error } = await this.resend.emails.send({
      from: this.from,
      to: [to],
      subject,
      html,
    });

    if (error) {
      throw new InternalServerErrorException(
        `Failed to send email: ${error.message}`,
      );
    }

    return data;
  }

  // Email a 6-digit verification code
  async sendVerificationCode(
    to: string,
    fullName: string,
    code: string,
    message = 'Enter this code to verify your email:',
  ) {
    await this.sendEmail(
      to,
      'Your Cargo System verification code',
      `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 500px;
          margin: 0 auto;
          padding: 30px;
          text-align: center;
          color: #333;
        ">

          <h2 style="margin-bottom: 10px;">
            Cargo System 🚗
          </h2>

          <p style="font-size: 16px;">
            Hi ${escapeHtml(fullName)},
          </p>

          <p style="font-size: 15px; line-height: 1.6;">
            ${message}
          </p>

          <p style="
            margin: 20px 0;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #2563eb;
          ">
            ${code}
          </p>

          <p style="font-size: 13px; color: #777;">
            This code expires in 10 minutes.
          </p>

        </div>
      `,
    );
  }

  // Tell a user their reservation was confirmed, cancelled or completed
  async sendReservationStatus(
    to: string,
    details: {
      fullName: string;
      reservationId: number;
      status: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
      car: string;
      startDate: Date;
      endDate: Date;
      totalPrice: number;
    },
  ) {
    const statusText = {
      CONFIRMED: {
        title: 'Your reservation is confirmed ✅',
        message: 'Your car is booked. See you on the start date!',
        color: '#16a34a',
      },
      CANCELLED: {
        title: 'Your reservation was cancelled',
        message: 'This reservation is no longer active.',
        color: '#dc2626',
      },
      COMPLETED: {
        title: 'Thanks for renting with us 🚗',
        message: 'Your reservation is complete. We hope you enjoyed the ride!',
        color: '#2563eb',
      },
    }[details.status];

    const formatDate = (date: Date) =>
      new Date(date).toISOString().slice(0, 10);

    await this.sendEmail(
      to,
      `Reservation #${details.reservationId}: ${details.status.toLowerCase()}`,
      `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 500px;
          margin: 0 auto;
          padding: 30px;
          color: #333;
        ">

          <h2 style="margin-bottom: 10px; color: ${statusText.color};">
            ${statusText.title}
          </h2>

          <p style="font-size: 16px;">
            Hi ${escapeHtml(details.fullName)},
          </p>

          <p style="font-size: 15px; line-height: 1.6;">
            ${statusText.message}
          </p>

          <table style="
            width: 100%;
            margin: 20px 0;
            border-collapse: collapse;
            font-size: 15px;
          ">
            <tr>
              <td style="padding: 8px 0; color: #777;">Reservation</td>
              <td style="padding: 8px 0; text-align: right;">#${details.reservationId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #777;">Car</td>
              <td style="padding: 8px 0; text-align: right;">${escapeHtml(details.car)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #777;">From</td>
              <td style="padding: 8px 0; text-align: right;">${formatDate(details.startDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #777;">To</td>
              <td style="padding: 8px 0; text-align: right;">${formatDate(details.endDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #777;">Total price</td>
              <td style="padding: 8px 0; text-align: right; font-weight: bold;">${details.totalPrice.toFixed(2)}</td>
            </tr>
          </table>

        </div>
      `,
    );
  }
}

// User-provided text (names, car models) must not be able to inject HTML
function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
