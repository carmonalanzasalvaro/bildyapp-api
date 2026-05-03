import mongoose from 'mongoose';
import Client from '../models/Client.js';
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

const assertUniqueCif = async (companyId, cif, excludedClientId) => {
  const query = buildScopedFilter(companyId, {
    cif,
    deleted: false
  });

  if (excludedClientId) {
    query._id = { $ne: excludedClientId };
  }

  const existingClient = await Client.findOne(query).select('_id');

  if (existingClient) {
    throw AppError.conflict('Ya existe un cliente con ese CIF en la compañía', 'CLIENT_CIF_EXISTS');
  }
};

const getClientByIdOrFail = async (companyId, clientId, extraFilter = {}) => {
  ensureValidObjectId(clientId);

  const client = await Client.findOne(buildScopedFilter(companyId, {
    _id: clientId,
    ...extraFilter
  }));

  if (!client) {
    throw AppError.notFound('Cliente no encontrado');
  }

  return client;
};

const hasAssociatedProjects = async (companyId, clientId) => {
  const Project = mongoose.models.Project;

  if (!Project) {
    return false;
  }

  const totalProjects = await Project.countDocuments({
    company: companyId,
    client: clientId,
    deleted: false
  });

  return totalProjects > 0;
};

export const createClient = async (user, payload) => {
  await assertUniqueCif(user.company._id, payload.cif);

  return Client.create({
    ...payload,
    user: user._id,
    company: user.company._id
  });
};

export const updateClient = async (companyId, clientId, payload) => {
  const client = await getClientByIdOrFail(companyId, clientId, { deleted: false });

  await assertUniqueCif(companyId, payload.cif, client._id);

  client.name = payload.name;
  client.cif = payload.cif;
  client.email = payload.email;
  client.phone = payload.phone ?? null;
  client.address = payload.address;

  await client.save();

  return client;
};

export const listClients = async (companyId, query, deleted = false) => {
  const currentPage = query.page;
  const limit = query.limit;
  const skip = (currentPage - 1) * limit;
  const filter = buildScopedFilter(companyId, { deleted });

  if (query.name) {
    filter.name = {
      $regex: query.name,
      $options: 'i'
    };
  }

  const [data, totalItems] = await Promise.all([
    Client.find(filter)
      .sort(query.sort)
      .skip(skip)
      .limit(limit),
    Client.countDocuments(filter)
  ]);

  return {
    data,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
    totalItems,
    currentPage
  };
};

export const getClientById = async (companyId, clientId) => getClientByIdOrFail(companyId, clientId);

export const deleteClient = async (companyId, clientId, softDelete = true) => {
  const client = await getClientByIdOrFail(companyId, clientId);

  if (softDelete) {
    client.deleted = true;
    await client.save();

    return {
      message: 'Cliente archivado correctamente'
    };
  }

  if (await hasAssociatedProjects(companyId, clientId)) {
    throw AppError.conflict('No se puede eliminar el cliente porque tiene proyectos asociados', 'CLIENT_HAS_PROJECTS');
  }

  await client.deleteOne();

  return {
    message: 'Cliente eliminado correctamente'
  };
};

export const restoreClient = async (companyId, clientId) => {
  const client = await getClientByIdOrFail(companyId, clientId, { deleted: true });
  client.deleted = false;
  await client.save();

  return client;
};
