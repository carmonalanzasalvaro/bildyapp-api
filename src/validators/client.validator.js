import { z } from 'zod';

const nonEmptyString = (message) => z.string().trim().min(1, message);
const objectIdField = z.string().trim().regex(/^[0-9a-fA-F]{24}$/, 'El identificador no es válido');
const pageField = z.coerce.number().int('La página debe ser un número entero').min(1, 'La página debe ser mayor o igual a 1').default(1);
const limitField = z.coerce.number().int('El límite debe ser un número entero').min(1, 'El límite debe ser mayor o igual a 1').max(100, 'El límite no puede ser mayor de 100').default(10);
const emailField = z.string().trim().email('El email no es válido').transform((value) => value.toLowerCase());
const phoneField = z.string().trim().min(1, 'El teléfono es obligatorio').optional();
const sortField = z.enum(['name', '-name', 'cif', '-cif', 'email', '-email', 'createdAt', '-createdAt', 'updatedAt', '-updatedAt']).default('createdAt');

const addressSchema = z.object({
  street: nonEmptyString('La calle es obligatoria'),
  number: nonEmptyString('El número es obligatorio'),
  postal: nonEmptyString('El código postal es obligatorio'),
  city: nonEmptyString('La ciudad es obligatoria'),
  province: nonEmptyString('La provincia es obligatoria')
});

const clientBodySchema = z.object({
  name: nonEmptyString('El nombre es obligatorio'),
  cif: nonEmptyString('El CIF es obligatorio').transform((value) => value.toUpperCase()),
  email: emailField,
  phone: phoneField,
  address: addressSchema
});

export const createClientSchema = z.object({
  body: clientBodySchema
});

export const updateClientSchema = z.object({
  params: z.object({
    id: objectIdField
  }),
  body: clientBodySchema
});

export const getClientSchema = z.object({
  params: z.object({
    id: objectIdField
  })
});

export const restoreClientSchema = z.object({
  params: z.object({
    id: objectIdField
  })
});

export const deleteClientSchema = z.object({
  params: z.object({
    id: objectIdField
  }),
  query: z.object({
    soft: z.enum(['true', 'false']).default('true')
  })
});

export const listClientSchema = z.object({
  query: z.object({
    page: pageField,
    limit: limitField,
    name: z.string().trim().min(1, 'El nombre no puede estar vacío').optional(),
    sort: sortField
  })
});
