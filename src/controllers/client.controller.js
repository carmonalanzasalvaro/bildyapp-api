import {
  createClient,
  deleteClient,
  getClientById,
  listClients,
  restoreClient,
  updateClient
} from '../services/client.service.js';

export const create = async (req, res, next) => {
  try {
    const client = await createClient(req.user, req.validated.body);
    return res.status(201).json({ client });
  } catch (error) {
    return next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const client = await updateClient(req.user.company._id, req.validated.params.id, req.validated.body);
    return res.status(200).json({ client });
  } catch (error) {
    return next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const result = await listClients(req.user.company._id, req.validated.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const listArchived = async (req, res, next) => {
  try {
    const result = await listClients(req.user.company._id, req.validated.query, true);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const client = await getClientById(req.user.company._id, req.validated.params.id);
    return res.status(200).json({ client });
  } catch (error) {
    return next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const result = await deleteClient(
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
    const client = await restoreClient(req.user.company._id, req.validated.params.id);
    return res.status(200).json({ client });
  } catch (error) {
    return next(error);
  }
};
