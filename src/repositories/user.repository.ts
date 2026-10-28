import type { Prisma, User } from '@prisma/client';
import { prisma } from '../database/prisma';
import type { Role, UserDto } from '../models';

/** Columns that are safe to send to the client (no password_hash / token_version). */
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type PublicUserRow = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;

export function toUserDto(row: PublicUserRow): UserDto {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role as Role,
    createdAt: row.createdAt.toISOString(),
  };
}

export const userRepository = {
  /** Full row including password hash — for authentication only, never returned to the client. */
  findByEmailWithSecrets(email: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { email } });
  },

  findByIdWithSecrets(id: number): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  },

  async findById(id: number): Promise<UserDto | null> {
    const row = await prisma.user.findUnique({ where: { id }, select: publicUserSelect });
    return row ? toUserDto(row) : null;
  },

  async findAll(filter: { role?: Role; search?: string }): Promise<UserDto[]> {
    const rows = await prisma.user.findMany({
      where: {
        role: filter.role,
        ...(filter.search && {
          OR: [
            { name: { contains: filter.search, mode: 'insensitive' } },
            { email: { contains: filter.search, mode: 'insensitive' } },
          ],
        }),
      },
      select: publicUserSelect,
      orderBy: { name: 'asc' },
    });
    return rows.map(toUserDto);
  },

  async create(data: { name: string; email: string; passwordHash: string; role: Role }): Promise<UserDto> {
    const row = await prisma.user.create({ data, select: publicUserSelect });
    return toUserDto(row);
  },

  /** Invalidates every token issued so far for this user (used by logout). */
  async incrementTokenVersion(id: number): Promise<void> {
    await prisma.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
  },
};
