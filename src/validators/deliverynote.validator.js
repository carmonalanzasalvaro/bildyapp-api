import { z } from 'zod';

const nonEmptyString = (message) => z.string().trim().min(1, message);
const objectIdField = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'El identificador no es válido');
const pageField = z.coerce.number().int('La página debe ser un número entero').min(1, 'La página debe ser mayor o igual a 1').default(1);
const limitField = z.coerce.number().int('El límite debe ser un número entero').min(1, 'El límite debe ser mayor o igual a 1').max(100, 'El límite no puede ser mayor de 100').default(10);
const sortField = z.enum(['workDate', '-workDate', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt', 'signedAt', '-signedAt']).default('-workDate');
const formatField = z.enum(['material', 'hours']);
const signedField = z.enum(['true', 'false']).transform((value) => value === 'true').optional();
const dateField = z.coerce.date({ invalid_type_error: 'La fecha no es válida' });
const positiveNumberField = (message) => z.coerce.number({ invalid_type_error: message }).positive(message);

const workerSchema = z.object({
  name: nonEmptyString('El nombre del trabajador es obligatorio'),
  hours: positiveNumberField('Las horas del trabajador deben ser mayores que 0')
});

const deliveryNoteBodySchema = z.object({
  client: objectIdField,
  project: objectIdField,
  format: formatField,
  description: nonEmptyString('La descripción es obligatoria'),
  workDate: dateField,
  material: z.string().trim().optional(),
  quantity: z.coerce.number().positive('La cantidad debe ser mayor que 0').optional(),
  unit: z.string().trim().optional(),
  hours: z.coerce.number().positive('Las horas deben ser mayores que 0').optional(),
  workers: z.array(workerSchema).optional()
}).superRefine((value, ctx) => {
  const material = value.material?.trim();
  const unit = value.unit?.trim();
  const workers = value.workers ?? [];

  if (value.format === 'material') {
    if (!material) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['material'],
        message: 'El material es obligatorio para albaranes de material'
      });
    }

    if (typeof value.quantity !== 'number') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity'],
        message: 'La cantidad es obligatoria para albaranes de material'
      });
    }

    if (!unit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['unit'],
        message: 'La unidad es obligatoria para albaranes de material'
      });
    }
  }

  if (value.format === 'hours' && typeof value.hours !== 'number' && workers.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['hours'],
      message: 'Debes indicar horas o trabajadores para albaranes de horas'
    });
  }
});

export const createDeliveryNoteSchema = z.object({
  body: deliveryNoteBodySchema
});

export const getDeliveryNoteSchema = z.object({
  params: z.object({
    id: objectIdField
  })
});

export const deleteDeliveryNoteSchema = z.object({
  params: z.object({
    id: objectIdField
  })
});

export const listDeliveryNoteSchema = z.object({
  query: z.object({
    page: pageField,
    limit: limitField,
    project: objectIdField.optional(),
    client: objectIdField.optional(),
    format: formatField.optional(),
    signed: signedField,
    from: z.coerce.date({ invalid_type_error: 'La fecha inicial no es válida' }).optional(),
    to: z.coerce.date({ invalid_type_error: 'La fecha final no es válida' }).optional(),
    sort: sortField
  }).superRefine((value, ctx) => {
    if (value.from && value.to && value.from > value.to) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['from'],
        message: 'La fecha inicial no puede ser posterior a la fecha final'
      });
    }
  })
});
