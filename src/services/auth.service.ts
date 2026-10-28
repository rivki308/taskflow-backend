import { signAccessToken } from '../auth/jwt';
import { DUMMY_PASSWORD_HASH, verifyPassword } from '../auth/password';
import type { Role, UserDto } from '../models';
import { toUserDto, userRepository } from '../repositories/user.repository';
import { HttpError } from '../utils/http-error';
import type { LoginInput } from '../validators/auth.schemas';

export interface LoginResult {
  token: string;
  tokenType: 'Bearer';
  expiresAt: string;
  user: UserDto;
}

export const authService = {
  async login({ email, password }: LoginInput): Promise<LoginResult> {
    const user = await userRepository.findByEmailWithSecrets(email);

    // Always run bcrypt, even for an unknown email, so response time does not reveal which emails exist.
    const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!user || !passwordOk) {
      // Same message for "no such email" and "wrong password".
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    const { token, expiresAt } = signAccessToken({
      id: user.id,
      role: user.role as Role,
      tokenVersion: user.tokenVersion,
    });

    return { token, tokenType: 'Bearer', expiresAt, user: toUserDto(user) };
  },

  /**
   * JWT logout: tokens are stateless, so each user has a "token version".
   * Logout increments it — every token issued before is rejected from now on.
   */
  async logout(userId: number): Promise<void> {
    await userRepository.incrementTokenVersion(userId);
  },

  async me(userId: number): Promise<UserDto> {
    const user = await userRepository.findById(userId);
    if (!user) throw HttpError.unauthorized('User no longer exists');
    return user;
  },
};
