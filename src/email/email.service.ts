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
            Hi ${fullName},
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
}
