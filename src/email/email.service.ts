import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');

    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured');
    }

    this.resend = new Resend(apiKey);
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
  ) {
    const { data, error } = await this.resend.emails.send({
      from: 'onboarding@resend.dev',
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