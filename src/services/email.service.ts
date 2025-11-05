import nodemailer from 'nodemailer';
import { logger } from '../config/logger.config';

class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendVerificationCode(email: string, code: string): Promise<boolean> {
        try {
            logger.info(`Sending verification code to ${email}`);

            const mailOptions = {
                from: process.env.SMTP_USER,
                to: email,
                subject: 'Email Verification Code',
                html: `
                    <h1>Email Verification</h1>
                    <p>Your verification code is: <strong>${code}</strong></p>
                    <p>This code will expire in 15 minutes.</p>
                `,
            };

            await this.transporter.sendMail(mailOptions);
            logger.info(`Verification code sent successfully to ${email}`);
            return true;
        } catch (error) {
            logger.error(`Failed to send verification code to ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
}

export default new EmailService();