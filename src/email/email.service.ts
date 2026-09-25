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
      this.configService.get<string>('EMAIL_FROM') ?? 'onboarding@resend.dev';
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
}