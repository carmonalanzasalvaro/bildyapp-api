import {
  createDeliveryNote,
  deleteDeliveryNote,
  getDeliveryNoteById,
  listDeliveryNotes
} from '../services/deliverynote.service.js';

export const create = async (req, res, next) => {
  try {
    const deliveryNote = await createDeliveryNote(req.user, req.validated.body);
    return res.status(201).json({ deliveryNote });
  } catch (error) {
    return next(error);
  }
};

export const list = async (req, res, next) => {
  try {
    const result = await listDeliveryNotes(req.user.company._id, req.validated.query);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};

export const getById = async (req, res, next) => {
  try {
    const deliveryNote = await getDeliveryNoteById(req.user.company._id, req.validated.params.id);
    return res.status(200).json({ deliveryNote });
  } catch (error) {
    return next(error);
  }
};

export const remove = async (req, res, next) => {
  try {
    const result = await deleteDeliveryNote(req.user.company._id, req.validated.params.id);
    return res.status(200).json(result);
  } catch (error) {
    return next(error);
  }
};
