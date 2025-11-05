"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_config_1 = require("../config/logger.config");
class EmailService {
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    async sendVerificationCode(email, code) {
        try {
            logger_config_1.logger.info(`Sending verification code to ${email}`);
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
            logger_config_1.logger.info(`Verification code sent successfully to ${email}`);
            return true;
        }
        catch (error) {
            logger_config_1.logger.error(`Failed to send verification code to ${email}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    }
}
exports.default = new EmailService();
