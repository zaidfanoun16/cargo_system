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
    message = 'أدخل هذا الرمز لتفعيل بريدك الإلكتروني:',
  ) {
    await this.sendEmail(
      to,
      'رمز التحقق من Cargo System',
      `
        <div dir="rtl" style="
          font-family: Tahoma, Arial, sans-serif;
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
            مرحباً ${escapeHtml(fullName)}،
          </p>

          <p style="font-size: 15px; line-height: 1.6;">
            ${message}
          </p>

          <p dir="ltr" style="
            margin: 20px 0;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #2563eb;
          ">
            ${code}
          </p>

          <p style="font-size: 13px; color: #777;">
            تنتهي صلاحية هذا الرمز خلال 10 دقائق.
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
        title: 'تم تأكيد حجزك ✅',
        message: 'سيارتك محجوزة، نراك في موعد الاستلام!',
        color: '#16a34a',
        subject: 'تم التأكيد',
      },
      CANCELLED: {
        title: 'تم إلغاء حجزك',
        message: 'هذا الحجز لم يعد فعّالاً.',
        color: '#dc2626',
        subject: 'تم الإلغاء',
      },
      COMPLETED: {
        title: 'شكراً لاستئجارك معنا 🚗',
        message: 'اكتمل حجزك، نتمنى أن تكون رحلتك ممتعة!',
        color: '#2563eb',
        subject: 'اكتمل',
      },
    }[details.status];

    const formatDate = (date: Date) =>
      new Date(date).toISOString().slice(0, 10);

    await this.sendEmail(
      to,
      `حجز رقم ${details.reservationId}: ${statusText.subject}`,
      `
        <div dir="rtl" style="
          font-family: Tahoma, Arial, sans-serif;
          max-width: 500px;
          margin: 0 auto;
          padding: 30px;
          text-align: right;
          color: #333;
        ">

          <h2 style="margin-bottom: 10px; color: ${statusText.color};">
            ${statusText.title}
          </h2>

          <p style="font-size: 16px;">
            مرحباً ${escapeHtml(details.fullName)}،
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
              <td style="padding: 8px 0; color: #777;">رقم الحجز</td>
              <td style="padding: 8px 0; text-align: left;">#${details.reservationId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #777;">السيارة</td>
              <td style="padding: 8px 0; text-align: left;">${escapeHtml(details.car)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #777;">من</td>
              <td style="padding: 8px 0; text-align: left;">${formatDate(details.startDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #777;">إلى</td>
              <td style="padding: 8px 0; text-align: left;">${formatDate(details.endDate)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #777;">السعر الكلي</td>
              <td style="padding: 8px 0; text-align: left; font-weight: bold;">${details.totalPrice.toFixed(2)}</td>
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
