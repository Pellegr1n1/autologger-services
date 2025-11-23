import { escapeHtml, sanitizeUserName } from './sanitize.util';

describe('sanitize.util', () => {
  describe('escapeHtml', () => {
    it('should escape HTML special characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      );
      expect(escapeHtml('Test & User')).toBe('Test &amp; User');
      expect(escapeHtml("It's a test")).toBe('It&#039;s a test');
    });

    it('should return empty string for null or undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should not escape safe characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
      expect(escapeHtml('Test123')).toBe('Test123');
    });

    it('should escape all HTML special characters', () => {
      expect(escapeHtml('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#039;');
    });
  });

  describe('sanitizeUserName', () => {
    it('should sanitize user name with HTML characters', () => {
      expect(sanitizeUserName('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
      );
      expect(sanitizeUserName('John & Doe')).toBe('John &amp; Doe');
    });

    it('should return default for null or undefined', () => {
      expect(sanitizeUserName(null)).toBe('Usuário');
      expect(sanitizeUserName(undefined)).toBe('Usuário');
    });

    it('should trim whitespace', () => {
      expect(sanitizeUserName('  John Doe  ')).toBe('John Doe');
    });

    it('should limit to 100 characters', () => {
      const longName = 'A'.repeat(150);
      const result = sanitizeUserName(longName);
      expect(result.length).toBe(103); // 100 + '...'
      expect(result).toContain('...');
    });

    it('should not truncate names shorter than 100 characters', () => {
      const shortName = 'John Doe';
      expect(sanitizeUserName(shortName)).toBe('John Doe');
    });

    it('should handle exactly 100 characters', () => {
      const exactName = 'A'.repeat(100);
      expect(sanitizeUserName(exactName)).toBe(exactName);
    });

    it('should handle exactly 101 characters', () => {
      const longName = 'A'.repeat(101);
      const result = sanitizeUserName(longName);
      expect(result.length).toBe(103); // 100 + '...'
      expect(result).toContain('...');
    });

    it('should sanitize and trim together', () => {
      expect(sanitizeUserName('  <script>test</script>  ')).toBe(
        '&lt;script&gt;test&lt;/script&gt;',
      );
    });
  });
});
