import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * Escape HTML special characters to prevent XSS attacks in email templates
 */
const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Create transporter based on environment
const createTransporter = () => {
  const config: EmailConfig = {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  };

  return nodemailer.createTransport(config);
};

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@chore-ganizer.com',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    logger.info('Email sent successfully', { to: options.to, subject: options.subject });
    return true;
  } catch (error) {
    logger.error('Failed to send email', { error, to: options.to });
    return false;
  }
};

// Pre-built email templates
export const sendChoreAssignedEmail = async (
  email: string,
  choreTitle: string,
  dueDate: Date,
  points: number
) => {
  return sendEmail({
    to: email,
    subject: `New Chore Assigned: ${choreTitle}`,
    html: `
      <h2>New Chore Assigned</h2>
      <p>You have been assigned a new chore:</p>
      <ul>
        <li><strong>Chore:</strong> ${escapeHtml(choreTitle)}</li>
        <li><strong>Due:</strong> ${dueDate.toLocaleDateString()}</li>
        <li><strong>Points:</strong> ${points}</li>
      </ul>
      <p>Log in to Chore-Ganizer to view details.</p>
    `,
  });
};

export const sendChoreCompletedEmail = async (
  email: string,
  childName: string,
  choreTitle: string,
  points: number
) => {
  return sendEmail({
    to: email,
    subject: `${childName} completed a chore!`,
    html: `
      <h2>Chore Completed</h2>
      <p>${escapeHtml(childName)} has completed:</p>
      <ul>
        <li><strong>Chore:</strong> ${escapeHtml(choreTitle)}</li>
        <li><strong>Points Earned:</strong> ${points}</li>
      </ul>
      <p>Log in to approve or review.</p>
    `,
  });
};

export const sendPointsEarnedEmail = async (
  email: string,
  childName: string,
  points: number,
  totalPoints: number
) => {
  return sendEmail({
    to: email,
    subject: `${childName} earned ${points} points!`,
    html: `
      <h2>Points Earned</h2>
      <p>${escapeHtml(childName)} has earned <strong>${points} points</strong>!</p>
      <p>New total: <strong>${totalPoints} points</strong></p>
    `,
  });
};

export default { sendEmail, sendChoreAssignedEmail, sendChoreCompletedEmail, sendPointsEarnedEmail };
