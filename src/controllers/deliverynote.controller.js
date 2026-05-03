import {
  createDeliveryNote,
  deleteDeliveryNote,
  getDeliveryNoteById,
  getDeliveryNotePdf,
  listDeliveryNotes,
  signDeliveryNote
} from '../services/deliverynote.service.js';
import AppError from '../utils/AppError.js';
import { Readable } from 'node:stream';
import { emitCompanyEvent } from '../services/realtime.service.js';

export const create = async (req, res, next) => {
  try {
    const deliveryNote = await createDeliveryNote(req.user, req.validated.body);
    emitCompanyEvent(req.user.company._id, 'deliverynote:new', {
      id: deliveryNote._id.toString(),
      company: deliveryNote.company.toString(),
      createdAt: deliveryNote.createdAt.toISOString(),
      format: deliveryNote.format,
      signed: deliveryNote.signed
    });
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

export const sign = async (req, res, next) => {
  try {
    if (!req.file?.buffer) {
      throw AppError.badRequest('Debes adjuntar la firma en el campo signature');
    }

    const deliveryNote = await signDeliveryNote(req.user, req.validated.params.id, req.file);
    emitCompanyEvent(req.user.company._id, 'deliverynote:signed', {
      id: deliveryNote._id.toString(),
      company: deliveryNote.company._id.toString(),
      createdAt: deliveryNote.createdAt.toISOString(),
      format: deliveryNote.format,
      signed: deliveryNote.signed,
      signedAt: deliveryNote.signedAt.toISOString()
    });
    return res.status(200).json({ deliveryNote });
  } catch (error) {
    return next(error);
  }
};

export const getPdf = async (req, res, next) => {
  try {
    const result = await getDeliveryNotePdf(req.user.company._id, req.validated.params.id);

    if (result.type === 'url') {
      return res.status(200).json({
        data: {
          url: result.url
        }
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="delivery-note-${req.validated.params.id}.pdf"`);

    Readable.from(result.buffer).pipe(res);
    return undefined;
  } catch (error) {
    return next(error);
  }
};
