import * as bcrypt from 'bcryptjs';

export class HashUtil {
  private static readonly SALT_ROUNDS = 12;

  static async hash(plainText: string): Promise<string> {
    return await bcrypt.hash(plainText, this.SALT_ROUNDS);
  }

  static async compare(plainText: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(plainText, hash);
  }
}