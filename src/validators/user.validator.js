import { z } from 'zod';

const emailField = z.string().trim().email('El email no es válido').transform((value) => value.toLowerCase());
const passwordField = z.string().min(8, 'La contraseña debe tener al menos 8 caracteres');
const nonEmptyString = (message) => z.string().trim().min(1, message);

export const registerUserSchema = z.object({
  body: z.object({
    email: emailField,
    password: passwordField
  })
});

export const validateEmailSchema = z.object({
  body: z.object({
    code: z.string().regex(/^\d{6}$/, 'El código debe tener 6 dígitos')
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: emailField,
    password: passwordField
  })
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: nonEmptyString('El nombre es obligatorio'),
    lastName: nonEmptyString('Los apellidos son obligatorios'),
    nif: z.string().trim().min(3, 'El NIF es obligatorio').transform((value) => value.toUpperCase()),
    address: nonEmptyString('La dirección es obligatoria')
  })
});

export const onboardCompanySchema = z.object({
  body: z.object({
    name: z.string().trim().min(1, 'El nombre es obligatorio').optional(),
    cif: z.string().trim().min(3, 'El CIF es obligatorio').transform((value) => value.toUpperCase()).optional(),
    address: z.string().trim().min(1, 'La dirección es obligatoria').optional(),
    isFreelance: z.boolean().default(false)
  }).superRefine((value, ctx) => {
    if (!value.isFreelance) {
      if (!value.name) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['name'],
          message: 'El nombre es obligatorio'
        });
      }

      if (!value.cif) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['cif'],
          message: 'El CIF es obligatorio'
        });
      }

      if (!value.address) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['address'],
          message: 'La dirección es obligatoria'
        });
      }
    }
  })
});
