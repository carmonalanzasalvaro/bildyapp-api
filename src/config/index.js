const requiredInProduction = ['MONGODB_URI'];

const readEnv = (...names) => {
  for (const name of names) {
    const value = process.env[name];

    if (value !== undefined && value !== '') {
      return value;
    }
  }

  return undefined;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number.parseInt(process.env.PORT || '3000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bildyapp',
  jwtSecret: process.env.JWT_SECRET || ((process.env.NODE_ENV || 'development') === 'production' ? undefined : 'bildyapp-dev-secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  mailFrom: process.env.MAIL_FROM || 'no-reply@bildyapp.local',
  mailtrapHost: process.env.MAILTRAP_HOST,
  mailtrapPort: Number.parseInt(process.env.MAILTRAP_PORT || '2525', 10),
  mailtrapUser: process.env.MAILTRAP_USER,
  mailtrapPass: process.env.MAILTRAP_PASS,
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL || null,
  storage: {
    endpoint: readEnv('STORAGE_ENDPOINT', 'S3_ENDPOINT', 'R2_ENDPOINT') || null,
    region: readEnv('STORAGE_REGION', 'S3_REGION', 'AWS_REGION', 'R2_REGION') || 'auto',
    accessKeyId: readEnv('STORAGE_ACCESS_KEY_ID', 'S3_ACCESS_KEY_ID', 'AWS_ACCESS_KEY_ID', 'R2_ACCESS_KEY_ID') || null,
    secretAccessKey: readEnv('STORAGE_SECRET_ACCESS_KEY', 'S3_SECRET_ACCESS_KEY', 'AWS_SECRET_ACCESS_KEY', 'R2_SECRET_ACCESS_KEY') || null,
    bucket: readEnv('STORAGE_BUCKET', 'S3_BUCKET', 'AWS_S3_BUCKET', 'R2_BUCKET') || null,
    publicBaseUrl: readEnv('STORAGE_PUBLIC_BASE_URL', 'S3_PUBLIC_BASE_URL', 'R2_PUBLIC_BASE_URL') || null,
    signedUrlTtl: Number.parseInt(process.env.STORAGE_SIGNED_URL_TTL || '900', 10),
    forcePathStyle: readEnv('STORAGE_FORCE_PATH_STYLE', 'S3_FORCE_PATH_STYLE') === 'true'
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

if (!config.jwtSecret) {
  throw new Error('Missing required environment variable: JWT_SECRET');
}

export default config;
