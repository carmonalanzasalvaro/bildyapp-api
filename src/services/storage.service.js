import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';
import config from '../config/index.js';
import AppError from '../utils/AppError.js';

const trimTrailingSlash = (value) => value?.replace(/\/+$/, '') || null;

const isAbsoluteUrl = (value) => /^https?:\/\//i.test(value);

const buildPublicUrl = (key) => {
  if (!config.storage.publicBaseUrl) {
    return null;
  }

  return `${trimTrailingSlash(config.storage.publicBaseUrl)}/${key}`;
};

const getStorageClient = () => {
  if (!config.storage.endpoint || !config.storage.region || !config.storage.accessKeyId || !config.storage.secretAccessKey) {
    throw new AppError('La configuración de almacenamiento no está completa', 500, 'STORAGE_NOT_CONFIGURED');
  }

  return new S3Client({
    endpoint: config.storage.endpoint,
    region: config.storage.region,
    credentials: {
      accessKeyId: config.storage.accessKeyId,
      secretAccessKey: config.storage.secretAccessKey
    },
    forcePathStyle: config.storage.forcePathStyle
  });
};

const ensureBucket = () => {
  if (!config.storage.bucket) {
    throw new AppError('El bucket de almacenamiento no está configurado', 500, 'STORAGE_NOT_CONFIGURED');
  }
};

const normalizeStoredValue = (value) => value?.replace(/^\/+/, '');

export const storageService = {
  async uploadBuffer({ key, buffer, contentType, cacheControl }) {
    ensureBucket();

    const normalizedKey = normalizeStoredValue(key);
    const client = getStorageClient();

    await client.send(new PutObjectCommand({
      Bucket: config.storage.bucket,
      Key: normalizedKey,
      Body: buffer,
      ContentType: contentType,
      ...(cacheControl ? { CacheControl: cacheControl } : {})
    }));

    return {
      key: normalizedKey,
      url: buildPublicUrl(normalizedKey) || normalizedKey
    };
  },

  async getSignedUrl(key, expiresIn = config.storage.signedUrlTtl) {
    ensureBucket();

    const normalizedKey = normalizeStoredValue(key);

    if (isAbsoluteUrl(normalizedKey)) {
      return normalizedKey;
    }

    const client = getStorageClient();

    return getS3SignedUrl(client, new GetObjectCommand({
      Bucket: config.storage.bucket,
      Key: normalizedKey
    }), { expiresIn });
  },

  async getFileUrl(storedValue) {
    if (!storedValue) {
      return null;
    }

    if (isAbsoluteUrl(storedValue)) {
      return storedValue;
    }

    return buildPublicUrl(storedValue) || this.getSignedUrl(storedValue);
  }
};

export default storageService;
