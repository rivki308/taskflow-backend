import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate';
import { projectService } from '../services/project.service';
import { idParamSchema } from '../validators/common.schemas';
import { createProjectSchema, listProjectsQuerySchema, updateProjectSchema } from '../validators/project.schemas';

export const projectController = {
  async list(req: Request, res: Response) {
    const query = listProjectsQuerySchema.parse(req.query);
    const projects = await projectService.list(currentUser(req), query);
    res.status(200).json({ data: projects });
  },

  async getById(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const project = await projectService.getById(currentUser(req), id);
    res.status(200).json({ data: project });
  },

  async create(req: Request, res: Response) {
    const input = createProjectSchema.parse(req.body);
    const project = await projectService.create(currentUser(req), input);
    res.status(201).json({ data: project });
  },

  async update(req: Request, res: Response) {
    const { id } = idParamSchema.parse(req.params);
    const input = updateProjectSchema.parse(req.body);
    const project = await projectService.update(id, input);
    res.status(200).json({ data: project });
  },
};
