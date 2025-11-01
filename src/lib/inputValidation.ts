import { z } from 'zod';

/**
 * Input validation schemas for security
 */

export const emailSchema = z
  .string()
  .trim()
  .email('Invalid email address')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase letter, one lowercase letter, and one number'
  );

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be less than 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

export const amountSchema = z
  .number()
  .positive('Amount must be positive')
  .max(10000000, 'Amount exceeds maximum limit')
  .finite('Amount must be a valid number');

export const textContentSchema = z
  .string()
  .trim()
  .max(5000, 'Content must be less than 5000 characters')
  .transform((val) => val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')); // Remove script tags

export const urlSchema = z
  .string()
  .url('Invalid URL')
  .max(2048, 'URL too long')
  .refine((url) => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }, 'URL must use HTTP or HTTPS protocol');

/**
 * Sanitize HTML content by removing potentially dangerous elements
 */
export function sanitizeHTML(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/javascript:/gi, '');
}

/**
 * Validate and sanitize user input
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors[0]?.message || 'Validation failed' 
      };
    }
    return { success: false, error: 'Invalid input' };
  }
}
