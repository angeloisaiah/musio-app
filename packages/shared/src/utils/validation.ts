/**
 * Validation utilities shared between client and server
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }

  if (email.length > 254) {
    return { isValid: false, error: 'Email is too long' };
  }

  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true };
}

export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters' };
  }

  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long' };
  }

  // Check for at least one letter and one number
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
    return { isValid: false, error: 'Password must contain at least one letter and one number' };
  }

  return { isValid: true };
}

export function validateUsername(username: string): ValidationResult {
  if (!username) {
    return { isValid: false, error: 'Username is required' };
  }

  if (username.length < 2) {
    return { isValid: false, error: 'Username must be at least 2 characters' };
  }

  if (username.length > 50) {
    return { isValid: false, error: 'Username is too long' };
  }

  // Allow letters, numbers, spaces, hyphens, underscores, apostrophes
  if (!/^[a-zA-Z0-9\s\-_']+$/.test(username)) {
    return { isValid: false, error: 'Username contains invalid characters' };
  }

  return { isValid: true };
}

export function validatePostTitle(title: string): ValidationResult {
  if (!title) {
    return { isValid: false, error: 'Title is required' };
  }

  if (title.length < 1) {
    return { isValid: false, error: 'Title cannot be empty' };
  }

  if (title.length > 200) {
    return { isValid: false, error: 'Title is too long (max 200 characters)' };
  }

  return { isValid: true };
}

export function validatePostCaption(caption: string): ValidationResult {
  if (caption.length > 2000) {
    return { isValid: false, error: 'Caption is too long (max 2000 characters)' };
  }

  return { isValid: true };
}

export function validateArtistName(artistName: string): ValidationResult {
  if (artistName.length > 100) {
    return { isValid: false, error: 'Artist name is too long (max 100 characters)' };
  }

  return { isValid: true };
}

export function validateFileSize(
  size: number,
  maxSize: number = 100 * 1024 * 1024,
): ValidationResult {
  if (size > maxSize) {
    const maxSizeMB = Math.round(maxSize / 1024 / 1024);
    return { isValid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }

  return { isValid: true };
}

export function validateMimeType(mimeType: string, allowedTypes: string[]): ValidationResult {
  if (!allowedTypes.includes(mimeType)) {
    return { isValid: false, error: 'File type not allowed' };
  }

  return { isValid: true };
}

// Common MIME types
export const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/webm'];

export const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/ogg'];

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
