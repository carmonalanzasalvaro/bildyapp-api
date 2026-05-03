import mongoose from 'mongoose';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import Client from '../models/Client.js';
import DeliveryNote from '../models/DeliveryNote.js';
import Project from '../models/Project.js';
import AppError from '../utils/AppError.js';
import { pdfService } from './pdf.service.js';
import { storageService } from './storage.service.js';

const ensureValidObjectId = (value, fieldName = 'id') => {
  if (!mongoose.isValidObjectId(value)) {
    throw AppError.badRequest(`Valor inválido para '${fieldName}': ${value}`);
  }
};

const buildScopedFilter = (companyId, extraFilter = {}) => ({
  company: companyId,
  ...extraFilter
});

const getClientByIdOrFail = async (companyId, clientId) => {
  ensureValidObjectId(clientId, 'client');

  const client = await Client.findOne(buildScopedFilter(companyId, {
    _id: clientId,
    deleted: false
  }));

  if (!client) {
    throw AppError.notFound('Cliente no encontrado');
  }

  return client;
};

const getProjectByIdOrFail = async (companyId, projectId) => {
  ensureValidObjectId(projectId, 'project');

  const project = await Project.findOne(buildScopedFilter(companyId, {
    _id: projectId,
    deleted: false
  }));

  if (!project) {
    throw AppError.notFound('Proyecto no encontrado');
  }

  return project;
};

const getDeliveryNoteByIdOrFail = async (companyId, deliveryNoteId, extraFilter = {}) => {
  ensureValidObjectId(deliveryNoteId);

  const deliveryNote = await DeliveryNote.findOne(buildScopedFilter(companyId, {
    _id: deliveryNoteId,
    ...extraFilter
  }));

  if (!deliveryNote) {
    throw AppError.notFound('Albarán no encontrado');
  }

  return deliveryNote;
};

const deliveryNotePopulate = [
  {
    path: 'user',
    select: 'name lastName email role company createdAt updatedAt'
  },
  {
    path: 'client'
  },
  {
    path: 'project'
  },
  {
    path: 'company'
  }
];

const buildStorageError = (action) => new AppError(
  `No se ha podido ${action} en el almacenamiento`,
  500,
  'STORAGE_ERROR'
);

const buildSignatureKey = (companyId, deliveryNoteId) => `delivery-notes/${companyId}/${deliveryNoteId}/signature-${randomUUID()}.webp`;

const buildPdfKey = (companyId, deliveryNoteId) => `delivery-notes/${companyId}/${deliveryNoteId}/delivery-note-${randomUUID()}.pdf`;

const optimizeSignature = async (inputBuffer) => {
  const resizedImage = sharp(inputBuffer).rotate().resize({
    width: 800,
    withoutEnlargement: true,
    fit: 'inside'
  });

  const [uploadBuffer, pdfBuffer] = await Promise.all([
    resizedImage.clone().webp({ quality: 80 }).toBuffer(),
    resizedImage.png().toBuffer()
  ]);

  return { uploadBuffer, pdfBuffer };
};

const getPopulatedDeliveryNoteById = async (companyId, deliveryNoteId, extraFilter = {}) => {
  const deliveryNote = await getDeliveryNoteByIdOrFail(companyId, deliveryNoteId, extraFilter);
  await deliveryNote.populate(deliveryNotePopulate);
  return deliveryNote;
};

const validateRelationships = async (companyId, clientId, projectId) => {
  const [client, project] = await Promise.all([
    getClientByIdOrFail(companyId, clientId),
    getProjectByIdOrFail(companyId, projectId)
  ]);

  if (project.client.toString() !== client._id.toString()) {
    throw AppError.badRequest('El proyecto no pertenece al cliente indicado', [
      {
        field: 'project',
        message: 'El proyecto no pertenece al cliente indicado'
      }
    ]);
  }

  return { client, project };
};

const normalizePayloadByFormat = (payload) => ({
  ...payload,
  material: payload.format === 'material' ? payload.material?.trim() ?? null : null,
  quantity: payload.format === 'material' ? payload.quantity : null,
  unit: payload.format === 'material' ? payload.unit?.trim() ?? null : null,
  hours: payload.format === 'hours' ? payload.hours ?? null : null,
  workers: payload.format === 'hours' ? (payload.workers ?? []) : []
});

export const createDeliveryNote = async (user, payload) => {
  await validateRelationships(user.company._id, payload.client, payload.project);

  return DeliveryNote.create({
    ...normalizePayloadByFormat(payload),
    user: user._id,
    company: user.company._id,
    signed: false,
    signedAt: null,
    signatureUrl: null,
    pdfUrl: null,
    deleted: false
  });
};

export const listDeliveryNotes = async (companyId, query) => {
  const currentPage = query.page;
  const limit = query.limit;
  const skip = (currentPage - 1) * limit;
  const filter = buildScopedFilter(companyId, { deleted: false });

  if (query.project) {
    filter.project = query.project;
  }

  if (query.client) {
    filter.client = query.client;
  }

  if (query.format) {
    filter.format = query.format;
  }

  if (typeof query.signed === 'boolean') {
    filter.signed = query.signed;
  }

  if (query.from || query.to) {
    filter.workDate = {};

    if (query.from) {
      filter.workDate.$gte = query.from;
    }

    if (query.to) {
      filter.workDate.$lte = query.to;
    }
  }

  const [data, totalItems] = await Promise.all([
    DeliveryNote.find(filter)
      .sort(query.sort)
      .skip(skip)
      .limit(limit),
    DeliveryNote.countDocuments(filter)
  ]);

  return {
    data,
    totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
    totalItems,
    currentPage
  };
};

export const getDeliveryNoteById = async (companyId, deliveryNoteId) => {
  return getPopulatedDeliveryNoteById(companyId, deliveryNoteId, { deleted: false });
};

export const deleteDeliveryNote = async (companyId, deliveryNoteId) => {
  const deliveryNote = await getDeliveryNoteByIdOrFail(companyId, deliveryNoteId, { deleted: false });

  if (deliveryNote.signed) {
    throw AppError.conflict('No se puede eliminar un albarán firmado', 'DELIVERY_NOTE_SIGNED');
  }

  deliveryNote.deleted = true;
  await deliveryNote.save();

  return {
    message: 'Albarán eliminado correctamente'
  };
};

export const signDeliveryNote = async (user, deliveryNoteId, file) => {
  const deliveryNote = await getPopulatedDeliveryNoteById(user.company._id, deliveryNoteId, { deleted: false });

  if (deliveryNote.signed) {
    throw AppError.conflict('El albarán ya está firmado', 'DELIVERY_NOTE_SIGNED');
  }

  const signedAt = new Date();
  const { uploadBuffer, pdfBuffer: pdfSignatureBuffer } = await optimizeSignature(file.buffer);

  let uploadedSignature;

  try {
    uploadedSignature = await storageService.uploadBuffer({
      key: buildSignatureKey(user.company._id.toString(), deliveryNote._id.toString()),
      buffer: uploadBuffer,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable'
    });
  } catch {
    throw buildStorageError('guardar la firma');
  }

  const pdfPayload = {
    ...deliveryNote.toObject(),
    signed: true,
    signedAt
  };

  const generatedPdfBuffer = await pdfService.generateDeliveryNotePdfBuffer({
    deliveryNote: pdfPayload,
    signatureBuffer: pdfSignatureBuffer
  });

  let uploadedPdf;

  try {
    uploadedPdf = await storageService.uploadBuffer({
      key: buildPdfKey(user.company._id.toString(), deliveryNote._id.toString()),
      buffer: generatedPdfBuffer,
      contentType: 'application/pdf',
      cacheControl: 'public, max-age=31536000, immutable'
    });
  } catch {
    throw buildStorageError('guardar el PDF');
  }

  deliveryNote.signed = true;
  deliveryNote.signedAt = signedAt;
  deliveryNote.signatureUrl = uploadedSignature.url;
  deliveryNote.pdfUrl = uploadedPdf.url;
  await deliveryNote.save();

  return deliveryNote;
};

export const getDeliveryNotePdf = async (companyId, deliveryNoteId) => {
  const deliveryNote = await getPopulatedDeliveryNoteById(companyId, deliveryNoteId, { deleted: false });

  if (deliveryNote.signed && deliveryNote.pdfUrl) {
    try {
      const url = await storageService.getFileUrl(deliveryNote.pdfUrl);
      return {
        type: 'url',
        url
      };
    } catch {
      throw buildStorageError('obtener el PDF');
    }
  }

  const buffer = await pdfService.generateDeliveryNotePdfBuffer({
    deliveryNote: deliveryNote.toObject()
  });

  return {
    type: 'buffer',
    buffer
  };
};
