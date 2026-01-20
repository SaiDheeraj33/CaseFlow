import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter: nodemailer.Transporter;

    constructor(private readonly configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('SMTP_HOST'),
            port: this.configService.get<number>('SMTP_PORT'),
            secure: false,
            auth: {
                user: this.configService.get<string>('SMTP_USER'),
                pass: this.configService.get<string>('SMTP_PASS'),
            },
        });
    }

    async sendMagicLinkEmail(to: string, magicLink: string): Promise<void> {
        const from = this.configService.get<string>('EMAIL_FROM') || 'CaseFlow <noreply@caseflow.app>';

        await this.transporter.sendMail({
            from,
            to,
            subject: 'Your CaseFlow Login Link',
            html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Login to CaseFlow</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 40px 20px;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
            <h1 style="font-size: 24px; font-weight: 600; color: #18181b; margin: 0 0 16px;">
              🔐 Login to CaseFlow
            </h1>
            <p style="color: #52525b; line-height: 1.6; margin: 0 0 24px;">
              Click the button below to securely log in to your CaseFlow account. This link will expire in 10 minutes.
            </p>
            <a href="${magicLink}" 
               style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px;">
              Login to CaseFlow →
            </a>
            <p style="color: #a1a1aa; font-size: 14px; margin: 24px 0 0; line-height: 1.5;">
              If you didn't request this email, you can safely ignore it.
            </p>
            <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;">
            <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
              CaseFlow - Import → Validate → Fix → Submit → Track
            </p>
          </div>
        </body>
        </html>
      `,
            text: `Login to CaseFlow\n\nClick here to log in: ${magicLink}\n\nThis link expires in 10 minutes.`,
        });
    }
}
