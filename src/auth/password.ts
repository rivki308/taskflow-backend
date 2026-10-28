import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/** Hash a plain password with bcrypt (salted, slow on purpose). */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * A valid hash of a random value — compared against when the email does not
 * exist, so a failed login takes the same time whether or not the user exists.
 */
export const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-password-for-timing', SALT_ROUNDS);
