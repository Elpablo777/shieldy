/**
 * Input validation and sanitization utilities for security
 */

// Validate environment variables
export function validateEnvironment(): void {
  const required = ['TOKEN', 'MONGO', 'ADMIN'];
  const missing: string[] = [];

  for (const envVar of required) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate TOKEN format (basic check for Telegram bot token)
  const token = process.env.TOKEN;
  if (token && !/^\d+:[A-Za-z0-9_-]{35}$/.test(token)) {
    console.warn('Warning: TOKEN format appears invalid for Telegram bot');
  }

  // Validate ADMIN is numeric
  const admin = process.env.ADMIN;
  if (admin && !/^\d+$/.test(admin)) {
    throw new Error('ADMIN must be a numeric Telegram user ID');
  }

  // Validate MONGO URL format
  const mongo = process.env.MONGO;
  if (mongo && !mongo.startsWith('mongodb://') && !mongo.startsWith('mongodb+srv://')) {
    throw new Error('MONGO must be a valid MongoDB connection string');
  }
}

// Sanitize user input
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Remove potential HTML/XSS
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove on* event handlers
    .trim()
    .slice(0, 1000); // Limit length
}

// Validate chat ID
export function validateChatId(chatId: number | string): boolean {
  if (typeof chatId === 'string') {
    return /^-?\d+$/.test(chatId);
  }
  return typeof chatId === 'number' && Number.isInteger(chatId);
}

// Validate user ID
export function validateUserId(userId: number | string): boolean {
  if (typeof userId === 'string') {
    return /^\d+$/.test(userId);
  }
  return typeof userId === 'number' && userId > 0 && Number.isInteger(userId);
}

// Sanitize message text for safe storage/display
export function sanitizeMessageText(text: string): string {
  if (typeof text !== 'string') {
    return '';
  }
  
  return text
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove most control characters, keep \n and \r
    .trim()
    .slice(0, 4096); // Telegram message limit
}

// Validate MongoDB ObjectId
export function validateObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(key: string, maxRequests: number = 10, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

// Clean expired rate limit entries periodically
let rateLimitCleanupInterval: NodeJS.Timeout | null = null;

/**
 * Starts the periodic cleanup of expired rate limit entries.
 * Call this function once during application initialization.
 */
export function initRateLimitCleanup(intervalMs: number = 300000): void {
  if (rateLimitCleanupInterval !== null) return; // Prevent multiple intervals
  rateLimitCleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (now > record.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }, intervalMs);
}

/**
 * Stops the periodic cleanup of expired rate limit entries.
 * Useful for tests or graceful shutdown.
 */
export function stopRateLimitCleanup(): void {
  if (rateLimitCleanupInterval !== null) {
    clearInterval(rateLimitCleanupInterval);
    rateLimitCleanupInterval = null;
  }
}