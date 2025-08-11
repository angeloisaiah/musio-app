import type { FastifyRequest, FastifyReply } from 'fastify';

// Input sanitization utilities
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

export function sanitizeEmail(email: unknown): string {
  if (typeof email !== 'string') {
    return '';
  }
  
  const sanitized = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(sanitized) ? sanitized : '';
}

export function sanitizeInteger(input: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const num = Number(input);
  
  if (isNaN(num) || !Number.isInteger(num)) {
    return min;
  }
  
  return Math.max(min, Math.min(max, num));
}

// Content Security Policy middleware
export async function addSecurityHeaders(request: FastifyRequest, reply: FastifyReply) {
  reply.headers({
    // Content Security Policy
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Allow inline scripts for Next.js
      "style-src 'self' 'unsafe-inline'", // Allow inline styles
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "media-src 'self' data: https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
    
    // Other security headers
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  });
}

// CORS configuration
export const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://musio.app',
      // Add your production domains here
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// File upload validation
export function validateFileUpload(file: any): { isValid: boolean; error?: string } {
  const allowedMimeTypes = [
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/webm',
    'image/jpeg',
    'image/png',
    'image/webp',
  ];
  
  const maxSize = 100 * 1024 * 1024; // 100MB
  
  if (!file) {
    return { isValid: false, error: 'No file provided' };
  }
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { isValid: false, error: 'Invalid file type' };
  }
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'File too large (max 100MB)' };
  }
  
  return { isValid: true };
}

// Request size limiter
export function createRequestSizeLimit(maxSize: number) {
  return async function requestSizeLimit(request: FastifyRequest, reply: FastifyReply) {
    const contentLength = request.headers['content-length'];
    
    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return reply.status(413).send({
        error: 'Payload Too Large',
        message: `Request size exceeds limit of ${Math.round(maxSize / 1024 / 1024)}MB`,
      });
    }
  };
}
