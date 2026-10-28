import type { Prisma } from '@prisma/client';
import type { AuthUser, ProjectDto } from '../models';
import { projectRepository, type ProjectWriteData } from '../repositories/project.repository';
import { formatDateOnly, parseDateOnly } from '../utils/dates';
import { HttpError } from '../utils/http-error';
import type { CreateProjectInput, ListProjectsQuery, UpdateProjectInput } from '../validators/project.schemas';

/** Admin sees every project; an employee sees only projects that contain a task assigned to them. */
function visibleProjectsWhere(user: AuthUser): Prisma.ProjectWhereInput {
  return user.role === 'Admin' ? {} : { tasks: { some: { assignedToId: user.id } } };
}

export const projectService = {
  list(user: AuthUser, query: ListProjectsQuery): Promise<ProjectDto[]> {
    return projectRepository.findAll({
      AND: [
        visibleProjectsWhere(user),
        query.status ? { status: query.status } : {},
        query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {},
      ],
    });
  },

  async getById(user: AuthUser, id: number): Promise<ProjectDto> {
    const project = await projectRepository.findById(id);
    if (!project) throw HttpError.notFound('Project not found');

    if (user.role !== 'Admin') {
      const visible = await projectRepository.findAll({ AND: [{ id }, visibleProjectsWhere(user)] });
      if (visible.length === 0) throw HttpError.forbidden('You do not have access to this project');
    }
    return project;
  },

  create(user: AuthUser, input: CreateProjectInput): Promise<ProjectDto> {
    return projectRepository.create({
      name: input.name,
      description: input.description,
      startDate: parseDateOnly(input.startDate),
      endDate: input.endDate ? parseDateOnly(input.endDate) : null,
      status: input.status,
      createdById: user.id, // from the token, never from the request body
    });
  },

  async update(id: number, input: UpdateProjectInput): Promise<ProjectDto> {
    const current = await projectRepository.findDates(id);
    if (!current) throw HttpError.notFound('Project not found');

    // Check the date rule against the values that will exist after the update.
    const startDate = input.startDate ?? formatDateOnly(current.startDate);
    const endDate =
      input.endDate !== undefined ? input.endDate : current.endDate ? formatDateOnly(current.endDate) : null;
    if (endDate && endDate < startDate) {
      throw HttpError.badRequest('endDate cannot be earlier than startDate', [
        { field: 'endDate', message: 'endDate cannot be earlier than startDate' },
      ]);
    }

    const data: ProjectWriteData = {
      name: input.name,
      description: input.description,
      status: input.status,
      startDate: input.startDate ? parseDateOnly(input.startDate) : undefined,
      endDate: input.endDate === undefined ? undefined : input.endDate ? parseDateOnly(input.endDate) : null,
    };
    return projectRepository.update(id, data);
  },
};
