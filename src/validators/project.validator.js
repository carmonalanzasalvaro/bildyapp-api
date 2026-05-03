import { z } from 'zod';

const nonEmptyString = (message) => z.string().trim().min(1, message);
const objectIdField = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'El identificador no es válido');
const pageField = z.coerce.number().int('La página debe ser un número entero').min(1, 'La página debe ser mayor o igual a 1').default(1);
const limitField = z.coerce.number().int('El límite debe ser un número entero').min(1, 'El límite debe ser mayor o igual a 1').max(100, 'El límite no puede ser mayor de 100').default(10);
const emailField = z.string().trim().email('El email no es válido').transform((value) => value.toLowerCase());
const sortField = z.enum(['name', '-name', 'projectCode', '-projectCode', 'email', '-email', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt']).default('createdAt');
const activeField = z.enum(['true', 'false']).transform((value) => value === 'true').optional();

const addressSchema = z.object({
  street: nonEmptyString('La calle es obligatoria'),
  number: nonEmptyString('El número es obligatorio'),
  postal: nonEmptyString('El código postal es obligatorio'),
  city: nonEmptyString('La ciudad es obligatoria'),
  province: nonEmptyString('La provincia es obligatoria')
});

const projectBodySchema = z.object({
  client: objectIdField,
  name: nonEmptyString('El nombre es obligatorio'),
  projectCode: nonEmptyString('El código del proyecto es obligatorio'),
  address: addressSchema,
  email: emailField,
  notes: z.string().trim().optional(),
  active: z.boolean().optional()
});

export const createProjectSchema = z.object({
  body: projectBodySchema
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: objectIdField
  }),
  body: projectBodySchema
});

export const getProjectSchema = z.object({
  params: z.object({
    id: objectIdField
  })
});

export const restoreProjectSchema = z.object({
  params: z.object({
    id: objectIdField
  })
});

export const deleteProjectSchema = z.object({
  params: z.object({
    id: objectIdField
  }),
  query: z.object({
    soft: z.enum(['true', 'false']).default('true')
  })
});

export const listProjectSchema = z.object({
  query: z.object({
    page: pageField,
    limit: limitField,
    client: objectIdField.optional(),
    name: z.string().trim().min(1, 'El nombre no puede estar vacío').optional(),
    active: activeField,
    sort: sortField
  })
});
