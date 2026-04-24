import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('EMAIL_HOST');
    const port = this.configService.get<number>('EMAIL_PORT');
    const user = this.configService.get<string>('EMAIL_USER');
    const pass = this.configService.get<string>('EMAIL_PASS');

    this.fromAddress = this.configService.get<string>('EMAIL_FROM') ?? user ?? '';

    if (!host || !port || !user || !pass) {
      this.transporter = null;
      this.logger.warn(
        'EMAIL_* env vars are incomplete. Email notifications are disabled.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      auth: {
        user,
        pass,
      },
      secure: port === 465,
    });
  }

  async send(options: {
    to: string;
    subject: string;
    text: string;
    html?: string;
  }) {
    if (!this.transporter || !this.fromAddress) {
      return { sent: false, reason: 'email-disabled' };
    }

    await this.transporter.sendMail({
      from: this.fromAddress,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return { sent: true };
  }
}
