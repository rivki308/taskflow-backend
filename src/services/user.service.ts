import { Prisma } from '@prisma/client';
import { hashPassword } from '../auth/password';
import type { UserDto } from '../models';
import { userRepository } from '../repositories/user.repository';
import { HttpError } from '../utils/http-error';
import type { CreateUserInput, ListUsersQuery } from '../validators/user.schemas';

export const userService = {
  list(query: ListUsersQuery): Promise<UserDto[]> {
    return userRepository.findAll(query);
  },

  async create(input: CreateUserInput): Promise<UserDto> {
    const existing = await userRepository.findByEmailWithSecrets(input.email);
    if (existing) throw HttpError.conflict('A user with this email already exists');

    try {
      return await userRepository.create({
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash: await hashPassword(input.password),
      });
    } catch (error) {
      // Two requests with the same email at the same moment — the UNIQUE index wins.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw HttpError.conflict('A user with this email already exists');
      }
      throw error;
    }
  },
};
