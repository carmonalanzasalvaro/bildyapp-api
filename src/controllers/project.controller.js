import {
  createProject,
  deleteProject,
  getProjectById,
  listProjects,
  restoreProject,
  updateProject
} from '../services/project.service.js';
import { emitCompanyEvent } from '../services/realtime.service.js';

export const create = async (req, res, next) => {
  try {
    const project = await createProject(req.user, req.validated.body);
    emitCompanyEvent(req.user.company._id, 'project:new', {
      id: project._id.toString(),
      company: project.company.toString(),
      createdAt: project.createdAt.toISOString(),
      name: project.name,
      projectCode: project.projectCode
    });
    return res.status(201).json({ project });
  } catch (error) {
    return next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const project = await updateProject(req.user.company._id, req.validated.params.id, req.validated.body);
    return res.status(200).json({ project });
  } catch (error) {
    return next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const result = await listProjects(req.user.company._id, req.validated.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const listArchived = async (req, res, next) => {
  try {
    const result = await listProjects(req.user.company._id, req.validated.query, true);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const project = await getProjectById(req.user.company._id, req.validated.params.id);
    return res.status(200).json({ project });
  } catch (error) {
    return next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const result = await deleteProject(
      req.user.company._id,
      req.validated.params.id,
      req.validated.query.soft === 'true'
    );

    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const restore = async (req, res, next) => {
  try {
    const project = await restoreProject(req.user.company._id, req.validated.params.id);
    return res.status(200).json({ project });
  } catch (error) {
    return next(error);
  }
};
