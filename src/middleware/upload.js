import fs from 'node:fs';
import multer from 'multer';
import config from '../config/index.js';
import AppError from '../utils/AppError.js';

fs.mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    const extension = file.originalname.split('.').pop();
    const safeName = file.originalname
      .replace(/\.[^/.]+$/, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/-+/g, '-');

    cb(null, `${Date.now()}-${safeName}.${extension}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    return cb(AppError.badRequest('Only image files are allowed'));
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: config.maxFileSize
  },
  fileFilter
});

export default upload;