import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './security.js';

describe('password security', () => {
  it('hashes and verifies passwords without storing plaintext', () => {
    const hash = hashPassword('correct horse battery staple');
    expect(hash).not.toContain('correct horse');
    expect(verifyPassword('correct horse battery staple', hash)).toBe(true);
    expect(verifyPassword('wrong password', hash)).toBe(false);
  });
});
