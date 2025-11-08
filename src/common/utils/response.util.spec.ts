import { ResponseUtil } from './response.util';

describe('ResponseUtil', () => {
  describe('success', () => {
    it('should return success response with data', () => {
      const data = { id: '123', name: 'Test' };
      const result = ResponseUtil.success(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.message).toBe('Operação realizada com sucesso');
      expect(result.timestamp).toBeDefined();
    });

    it('should return success response with custom message', () => {
      const data = { id: '123' };
      const message = 'Custom success message';
      const result = ResponseUtil.success(data, message);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.message).toBe(message);
    });
  });

  describe('error', () => {
    it('should return error response', () => {
      const message = 'Error occurred';
      const result = ResponseUtil.error(message);

      expect(result.success).toBe(false);
      expect(result.message).toBe(message);
      expect(result.error).toBeUndefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should return error response with error details', () => {
      const message = 'Error occurred';
      const error = 'Detailed error message';
      const result = ResponseUtil.error(message, error);

      expect(result.success).toBe(false);
      expect(result.message).toBe(message);
      expect(result.error).toBe(error);
    });
  });
});

