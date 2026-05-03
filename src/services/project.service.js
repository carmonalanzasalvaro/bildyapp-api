import mongoose from 'mongoose';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import AppError from '../utils/AppError.js';

const ensureValidObjectId = (value, fieldName = 'id') => {
  if (!mongoose.isValidObjectId(value)) {
    throw AppError.badRequest(`Valor inválido para '${fieldName}': ${value}`);
  }
};

const buildScopedFilter = (companyId, extraFilter = {}) => ({
  company: companyId,
  ...extraFilter
});

const assertUniqueProjectCode = async (companyId, projectCode, excludedProjectId) => {
  const query = buildScopedFilter(companyId, {
    projectCode,
    deleted: false
  });

  if (excludedProjectId) {
    query._id = { $ne: excludedProjectId };
  }

  const existingProject = await Project.findOne(query).select('_id');

  if (existingProject) {
    throw AppError.conflict('Ya existe un proyecto con ese código en la compañía', 'PROJECT_CODE_EXISTS');
  }
};

const getProjectByIdOrFail = async (companyId, projectId, extraFilter = {}) => {
  ensureValidObjectId(projectId);

  const project = await Project.findOne(buildScopedFilter(companyId, {
    _id: projectId,
    ...extraFilter
  }));

  if (!project) {
    throw AppError.notFound('Proyecto no encontrado');
  }

  return project;
};

const getClientByIdOrFail = async (companyId, clientId) => {
  ensureValidObjectId(clientId, 'client');

  const client = await Client.findOne(buildScopedFilter(companyId, {
    _id: clientId,
    deleted: false
  })).select('_id');

  if (!client) {
    throw AppError.notFound('Cliente no encontrado');
  }

  return client;
};

const hasAssociatedDeliveryNotes = async (companyId, projectId) => {
  const DeliveryNote = mongoose.models.DeliveryNote;

  if (!DeliveryNote) {
    return false;
  }

  const totalDeliveryNotes = await DeliveryNote.countDocuments({
    company: companyId,
    project: projectId,
    deleted: false
  });

  return totalDeliveryNotes > 0;
};

export const createProject = async (user, payload) => {
  await getClientByIdOrFail(user.company._id, payload.client);
  await assertUniqueProjectCode(user.company._id, payload.projectCode);

  return Project.create({
    ...payload,
    notes: payload.notes ?? null,
    active: payload.active ?? true,
    user: user._id,
    company: user.company._id
  });
};

export const updateProject = async (companyId, projectId, payload) => {
  const project = await getProjectByIdOrFail(companyId, projectId, { deleted: false });

  await getClientByIdOrFail(companyId, payload.client);
  await assertUniqueProjectCode(companyId, payload.projectCode, project._id);

  project.client = payload.client;
  project.name = payload.name;
  project.projectCode = payload.projectCode;
  project.address = payload.address;
  project.email = payload.email;
  project.notes = payload.notes ?? null;
  project.active = payload.active ?? true;

  await project.save();

  return project;
};

export const listProjects = async (companyId, query, deleted = false) => {
  const currentPage = query.page;
  const limit = query.limit;
  const skip = (currentPage - 1) * limit;
  const filter = buildScopedFilter(companyId, { deleted });

  if (query.client) {
    filter.client = query.client;
  }

  if (query.name) {
    filter.name = {
      $regex: query.name,
      $options: 'i'
    };
  }

  if (typeof query.active === 'boolean') {
    filter.active = query.active;
  }

  const [data, totalItems] = await Promise.all([
    Project.find(filter)
      .sort(query.sort)
      .skip(skip)
      .limit(limit),
    Project.countDocuments(filter)
  ]);

  return {
    data,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
    totalItems,
    currentPage
  };
};

export const getProjectById = async (companyId, projectId) => getProjectByIdOrFail(companyId, projectId);

export const deleteProject = async (companyId, projectId, softDelete = true) => {
  const project = await getProjectByIdOrFail(companyId, projectId);

  if (softDelete) {
    project.deleted = true;
    await project.save();

    return {
      message: 'Proyecto archivado correctamente'
    };
  }

  if (await hasAssociatedDeliveryNotes(companyId, projectId)) {
    throw AppError.conflict('No se puede eliminar el proyecto porque tiene albaranes asociados', 'PROJECT_HAS_DELIVERY_NOTES');
  }

  await project.deleteOne();

  return {
    message: 'Proyecto eliminado correctamente'
  };
};

export const restoreProject = async (companyId, projectId) => {
  const project = await getProjectByIdOrFail(companyId, projectId, { deleted: true });

  await assertUniqueProjectCode(companyId, project.projectCode, project._id);

  project.deleted = false;
  await project.save();

  return project;
};
