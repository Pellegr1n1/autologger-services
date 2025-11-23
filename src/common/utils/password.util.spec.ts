import { isPasswordStrong } from './password.util';

describe('password.util', () => {
  describe('isPasswordStrong', () => {
    it('should return true for strong password', () => {
      expect(isPasswordStrong('Password123!')).toBe(true);
      expect(isPasswordStrong('MyStr0ng@Pass')).toBe(true);
      expect(isPasswordStrong('Test123#Pass')).toBe(true);
    });

    it('should return false for password shorter than 8 characters', () => {
      expect(isPasswordStrong('Pass1!')).toBe(false);
      expect(isPasswordStrong('P1!')).toBe(false);
    });

    it('should return false for password without lowercase', () => {
      expect(isPasswordStrong('PASSWORD123!')).toBe(false);
      expect(isPasswordStrong('TEST123!')).toBe(false);
    });

    it('should return false for password without uppercase', () => {
      expect(isPasswordStrong('password123!')).toBe(false);
      expect(isPasswordStrong('test123!')).toBe(false);
    });

    it('should return false for password without number', () => {
      expect(isPasswordStrong('Password!')).toBe(false);
      expect(isPasswordStrong('TestPass!')).toBe(false);
    });

    it('should return false for password without special character', () => {
      expect(isPasswordStrong('Password123')).toBe(false);
      expect(isPasswordStrong('Test123Pass')).toBe(false);
    });

    it('should return false for null or undefined', () => {
      expect(isPasswordStrong(null as any)).toBe(false);
      expect(isPasswordStrong(undefined as any)).toBe(false);
      expect(isPasswordStrong('')).toBe(false);
    });

    it('should return false for password with exactly 7 characters', () => {
      expect(isPasswordStrong('Pass1!')).toBe(false);
    });

    it('should return true for password with exactly 8 characters meeting all requirements', () => {
      expect(isPasswordStrong('Pass1!@#')).toBe(true);
    });
  });
});
