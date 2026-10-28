import type { Prisma } from '@prisma/client';
import { prisma } from '../database/prisma';
import type { ProjectDto, ProjectStatus } from '../models';
import { formatDateOnly } from '../utils/dates';

const projectSelect = {
  id: true,
  name: true,
  description: true,
  startDate: true,
  endDate: true,
  status: true,
  createdAt: true,
  createdBy: { select: { id: true, name: true } },
  _count: { select: { tasks: true } },
} satisfies Prisma.ProjectSelect;

type ProjectRow = Prisma.ProjectGetPayload<{ select: typeof projectSelect }>;

function toProjectDto(row: ProjectRow): ProjectDto {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    startDate: formatDateOnly(row.startDate),
    endDate: row.endDate ? formatDateOnly(row.endDate) : null,
    status: row.status as ProjectStatus,
    createdBy: row.createdBy,
    taskCount: row._count.tasks,
    createdAt: row.createdAt.toISOString(),
  };
}

export interface ProjectWriteData {
  name?: string;
  description?: string | null;
  startDate?: Date;
  endDate?: Date | null;
  status?: ProjectStatus;
}

export const projectRepository = {
  async findAll(where: Prisma.ProjectWhereInput): Promise<ProjectDto[]> {
    const rows = await prisma.project.findMany({
      where,
      select: projectSelect,
      orderBy: [{ startDate: 'desc' }, { id: 'desc' }],
    });
    return rows.map(toProjectDto);
  },

  async findById(id: number): Promise<ProjectDto | null> {
    const row = await prisma.project.findUnique({ where: { id }, select: projectSelect });
    return row ? toProjectDto(row) : null;
  },

  /** Raw dates of a project — needed to validate a partial update. */
  findDates(id: number) {
    return prisma.project.findUnique({ where: { id }, select: { startDate: true, endDate: true } });
  },

  async create(data: Required<Pick<ProjectWriteData, 'name' | 'startDate'>> & ProjectWriteData & { createdById: number }) {
    const row = await prisma.project.create({ data, select: projectSelect });
    return toProjectDto(row);
  },

  async update(id: number, data: ProjectWriteData): Promise<ProjectDto> {
    const row = await prisma.project.update({ where: { id }, data, select: projectSelect });
    return toProjectDto(row);
  },
};
