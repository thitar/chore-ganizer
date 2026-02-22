import { sendEmail, sendChoreAssignedEmail, sendChoreCompletedEmail, sendPointsEarnedEmail } from '../../services/emailService';
import nodemailer from 'nodemailer';

// Mock nodemailer
jest.mock('nodemailer');

const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({
  sendMail: mockSendMail,
}));

(nodemailer.createTransport as jest.Mock) = mockCreateTransport;

describe('Email Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment variables
    process.env.SMTP_HOST = 'smtp.test.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_SECURE = 'false';
    process.env.SMTP_USER = 'test@test.com';
    process.env.SMTP_PASS = 'test-password';
    process.env.SMTP_FROM = 'test@test.com';
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-id' });

      const result = await sendEmail({
        to: 'recipient@test.com',
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(result).toBe(true);
      expect(mockCreateTransport).toHaveBeenCalledWith({
        host: 'smtp.test.com',
        port: 587,
        secure: false,
        auth: {
          user: 'test@test.com',
          pass: 'test-password',
        },
      });
      expect(mockSendMail).toHaveBeenCalledWith({
        from: 'test@test.com',
        to: 'recipient@test.com',
        subject: 'Test Subject',
        text: 'Test message',
        html: undefined,
      });
    });

    it('should send email with HTML content', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-id' });

      const result = await sendEmail({
        to: 'recipient@test.com',
        subject: 'Test Subject',
        html: '<p>Test HTML</p>',
      });

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: '<p>Test HTML</p>',
        })
      );
    });

    it('should handle send errors gracefully', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP error'));

      const result = await sendEmail({
        to: 'recipient@test.com',
        subject: 'Test Subject',
        text: 'Test message',
      });

      expect(result).toBe(false);
    });

    it('should use default SMTP settings if env vars not set', async () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      mockSendMail.mockResolvedValueOnce({ messageId: 'test-id' });

      await sendEmail({
        to: 'recipient@test.com',
        subject: 'Test Subject',
      });

      expect(mockCreateTransport).toHaveBeenCalledWith({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: '',
          pass: '',
        },
      });
    });
  });

  describe('sendChoreAssignedEmail', () => {
    it('should send chore assigned email with correct content', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-id' });

      const dueDate = new Date('2024-12-31');
      const result = await sendChoreAssignedEmail(
        'child@test.com',
        'Clean Room',
        dueDate,
        10
      );

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'child@test.com',
          subject: 'New Chore Assigned: Clean Room',
          html: expect.stringContaining('Clean Room'),
        })
      );
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('10'),
        })
      );
    });
  });

  describe('sendChoreCompletedEmail', () => {
    it('should send chore completed email with correct content', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-id' });

      const result = await sendChoreCompletedEmail(
        'parent@test.com',
        'Johnny',
        'Wash Dishes',
        15
      );

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'parent@test.com',
          subject: 'Johnny completed a chore!',
          html: expect.stringContaining('Johnny'),
        })
      );
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('Wash Dishes'),
        })
      );
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('15'),
        })
      );
    });
  });

  describe('sendPointsEarnedEmail', () => {
    it('should send points earned email with correct content', async () => {
      mockSendMail.mockResolvedValueOnce({ messageId: 'test-id' });

      const result = await sendPointsEarnedEmail(
        'parent@test.com',
        'Susie',
        20,
        150
      );

      expect(result).toBe(true);
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'parent@test.com',
          subject: 'Susie earned 20 points!',
          html: expect.stringContaining('20 points'),
        })
      );
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('150 points'),
        })
      );
    });
  });
});
