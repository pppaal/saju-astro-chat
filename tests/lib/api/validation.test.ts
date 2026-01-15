// tests/lib/api/validation.test.ts
import { describe, it, expect } from 'vitest';
import { validateFields } from '@/lib/api/validation';

describe('validateFields', () => {
  it('should pass when required field is present', () => {
    const data = { name: 'John' };
    const rules = { name: { required: true } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should fail when required field is missing', () => {
    const data = {};
    const rules = { name: { required: true } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('name is required');
  });

  it('should validate string type', () => {
    const data = { name: 'John' };
    const rules = { name: { type: 'string' as const } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(true);
  });

  it('should fail for wrong type', () => {
    const data = { name: 123 };
    const rules = { name: { type: 'string' as const } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('name must be a string');
  });

  it('should validate number range', () => {
    const data = { age: 25 };
    const rules = { age: { min: 18, max: 100 } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(true);
  });

  it('should fail when number is below min', () => {
    const data = { age: 10 };
    const rules = { age: { min: 18 } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(false);
  });

  it('should validate string length', () => {
    const data = { name: 'John' };
    const rules = { name: { minLength: 3, maxLength: 10 } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(true);
  });

  it('should fail when string is too short', () => {
    const data = { name: 'Jo' };
    const rules = { name: { minLength: 3 } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(false);
  });

  it('should validate pattern', () => {
    const data = { email: 'test@example.com' };
    const rules = { email: { pattern: /^[^@]+@[^@]+\.[^@]+$/ } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(true);
  });

  it('should collect multiple errors', () => {
    const data = { name: '', age: 10 };
    const rules = {
      name: { required: true },
      age: { required: true, min: 18 }
    };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});
