import { z } from 'zod';

const trimmedString = (fieldName, min = 1) =>
  z
    .string({
      required_error: `${fieldName} is required`
    })
    .trim()
    .min(min, `${fieldName} is required`);

const emailSchema = z
  .string({
    required_error: 'Email is required'
  })
  .trim()
  .toLowerCase()
  .email('Invalid email');

const passwordSchema = z
  .string({
    required_error: 'Password is required'
  })
  .min(8, 'Password must be at least 8 characters');

const nifSchema = z
  .string({
    required_error: 'NIF is required'
  })
  .trim()
  .toUpperCase()
  .min(1, 'NIF is required');

const addressSchema = z.object({
  street: z.string().trim().optional().default(''),
  number: z.string().trim().optional().default(''),
  postal: z.string().trim().optional().default(''),
  city: z.string().trim().optional().default(''),
  province: z.string().trim().optional().default('')
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const validationCodeSchema = z.object({
  code: z
    .string({
      required_error: 'Code is required'
    })
    .trim()
    .regex(/^\d{6}$/, 'Code must contain exactly 6 digits')
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string({
      required_error: 'Password is required'
    })
    .min(1, 'Password is required')
});

export const updateProfileSchema = z.object({
  name: trimmedString('Name'),
  lastName: trimmedString('Last name'),
  nif: nifSchema,
  address: addressSchema.optional().default({})
});

const companyFreelanceSchema = z.object({
  isFreelance: z.literal(true)
});

const companyStandardSchema = z.object({
  isFreelance: z.literal(false),
  name: trimmedString('Company name'),
  cif: z
    .string({
      required_error: 'CIF is required'
    })
    .trim()
    .toUpperCase()
    .min(1, 'CIF is required'),
  address: addressSchema
});

export const companySchema = z.discriminatedUnion('isFreelance', [
  companyFreelanceSchema,
  companyStandardSchema
]);

export const refreshTokenSchema = z.object({
  refreshToken: z
    .string({
      required_error: 'Refresh token is required'
    })
    .trim()
    .min(1, 'Refresh token is required')
});

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({
        required_error: 'Current password is required'
      })
      .min(1, 'Current password is required'),
    newPassword: passwordSchema
  })
  .refine(
    (data) => data.currentPassword !== data.newPassword,
    {
      message: 'New password must be different from current password',
      path: ['newPassword']
    }
  );

export const inviteUserSchema = z.object({
  email: emailSchema,
  name: trimmedString('Name'),
  lastName: trimmedString('Last name')
});

export const softDeleteQuerySchema = z.object({
  soft: z
    .enum(['true', 'false'])
    .optional()
});

export const mongoIdParamSchema = z.object({
  id: z
    .string()
    .trim()
    .regex(/^[a-f\d]{24}$/i, 'Invalid id')
});