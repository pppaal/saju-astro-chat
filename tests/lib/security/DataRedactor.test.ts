import { describe, it, expect } from 'vitest';
import { 
  hashName, 
  maskDisplayName, 
  maskTextWithName, 
  maskEmail, 
  maskPayload,
  maskAstrologyInput 
} from '@/lib/security/DataRedactor';

describe('DataRedactor', () => {
  describe('hashName', () => {
    it('should hash names consistently', () => {
      const hash1 = hashName('John Doe');
      const hash2 = hashName('John Doe');
      expect(hash1).toBe(hash2);
    });

    it('should produce different hashes for different names', () => {
      const hash1 = hashName('John');
      const hash2 = hashName('Jane');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('maskDisplayName', () => {
    it('should mask single word names', () => {
      const masked = maskDisplayName('John');
      expect(masked).toContain('*');
      // Format: first char + ***
      expect(masked).toBe('J***');
    });

    it('should mask multi-word names', () => {
      const masked = maskDisplayName('John Doe');
      expect(masked).toContain('*');
      expect(masked).toBe('J***');
    });

    it('should handle empty name', () => {
      const masked = maskDisplayName('');
      // Empty returns undefined
      expect(masked).toBeUndefined();
    });

    it('should handle short names', () => {
      const masked = maskDisplayName('Jo');
      // Still first char + ***
      expect(masked).toBe('J***');
    });
  });

  describe('maskTextWithName', () => {
    it('should mask name occurrences in text', () => {
      const text = 'Hello John, how are you John?';
      const masked = maskTextWithName(text, 'John');
      expect(masked).not.toContain('John');
      expect(masked).toContain('*');
    });

    it('should handle text without name', () => {
      const text = 'Hello there';
      const masked = maskTextWithName(text, 'John');
      expect(masked).toBe(text);
    });
  });

  describe('maskEmail', () => {
    it('should mask email address', () => {
      const masked = maskEmail('test@example.com');
      expect(masked).toContain('***');
      expect(masked).toContain('@');
    });

    it('should handle short local part', () => {
      const masked = maskEmail('a@example.com');
      expect(masked).toContain('@');
    });

    it('should handle empty email', () => {
      const masked = maskEmail('');
      // Empty email returns '***@***'
      expect(masked).toBe('***@***');
    });

    it('should handle undefined email', () => {
      const masked = maskEmail(undefined);
      expect(masked).toBe('***@***');
    });
  });

  describe('maskPayload', () => {
    it('should mask name fields in payload', () => {
      const payload = { name: 'John Doe', age: 30 };
      const masked = maskPayload(payload);
      expect(masked.name).not.toBe('John Doe');
      expect(masked.age).toBe(30);
    });

    it('should mask email fields', () => {
      const payload = { email: 'test@example.com' };
      const masked = maskPayload(payload);
      expect(masked.email).toContain('***');
    });

    it('should handle nested objects - only masks top level', () => {
      // maskPayload does shallow masking, nested objects are not recursively masked
      const payload = { user: { name: 'John' } };
      const masked = maskPayload(payload);
      // Nested name is NOT masked (only top-level fields)
      expect((masked.user as Record<string, unknown>).name).toBe('John');
    });
  });

  describe('maskAstrologyInput', () => {
    it('should mask name in astrology input', () => {
      const input = { name: 'John Doe', birthDate: '1990-01-01' };
      const masked = maskAstrologyInput(input);
      // Name is masked to first char + ***
      expect(masked.name).toBe('J***');
    });

    it('should mask coordinates to 2 decimal places as strings', () => {
      const input = { latitude: 37.5, longitude: 127.0 };
      const masked = maskAstrologyInput(input);
      // toFixed(2) returns strings
      expect(masked.latitude).toBe('37.50');
      expect(masked.longitude).toBe('127.00');
    });

    it('should handle missing values', () => {
      const input = {};
      const masked = maskAstrologyInput(input);
      expect(masked.name).toBeUndefined();
      expect(masked.latitude).toBeUndefined();
    });
  });
});
