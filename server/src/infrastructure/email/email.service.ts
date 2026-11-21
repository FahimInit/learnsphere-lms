import { logger } from '../../utils/logger';
import { env } from '../../config/env';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailProvider {
  sendEmail(message: EmailMessage): Promise<void>;
}

class ConsoleEmailProvider implements EmailProvider {
  public readonly sentEmails: EmailMessage[] = [];

  async sendEmail(message: EmailMessage): Promise<void> {
    this.sentEmails.push(message);
    logger.info('Email dispatched via ConsoleEmailProvider', {
      from: env.EMAIL_FROM,
      to: message.to,
      subject: message.subject,
    });
  }
}

export const consoleEmailProvider = new ConsoleEmailProvider();
export const emailService: EmailProvider = consoleEmailProvider;
