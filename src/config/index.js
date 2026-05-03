const requiredInProduction = ['MONGODB_URI'];

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number.parseInt(process.env.PORT || '3000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bildyapp',
  jwtSecret: process.env.JWT_SECRET || 'bildyapp-dev-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  mailFrom: process.env.MAIL_FROM || 'no-reply@bildyapp.local',
  mailtrapHost: process.env.MAILTRAP_HOST,
  mailtrapPort: Number.parseInt(process.env.MAILTRAP_PORT || '2525', 10),
  mailtrapUser: process.env.MAILTRAP_USER,
  mailtrapPass: process.env.MAILTRAP_PASS,
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT || null,
    region: process.env.STORAGE_REGION || 'auto',
    accessKeyId: process.env.STORAGE_ACCESS_KEY_ID || null,
    secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY || null,
    bucket: process.env.STORAGE_BUCKET || null,
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL || null,
    signedUrlTtl: Number.parseInt(process.env.STORAGE_SIGNED_URL_TTL || '900', 10),
    forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true'
  },
  isProduction: (process.env.NODE_ENV || 'development') === 'production',
  isTest: process.env.NODE_ENV === 'test'
};

if (config.isProduction) {
  for (const variable of requiredInProduction) {
    if (!process.env[variable]) {
      throw new Error(`Missing required environment variable: ${variable}`);
    }
  }
}

export default config;
