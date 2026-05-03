import multer, { MulterError } from 'multer';
import AppError from '../utils/AppError.js';

const allowedMimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp'
]);

const signatureUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1
  },
  fileFilter: (_req, file, cb) => {
    if (!allowedMimeTypes.has(file.mimetype)) {
      cb(AppError.badRequest('La firma debe ser una imagen PNG, JPG o WebP'));
      return;
    }

    cb(null, true);
  }
});

export const uploadSignature = {
  single: (fieldName) => (req, res, next) => {
    signatureUpload.single(fieldName)(req, res, (error) => {
      if (error instanceof MulterError) {
        return next(error);
      }

      if (error) {
        return next(error);
      }

      return next();
    });
  }
};

export default uploadSignature;
