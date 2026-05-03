const requiredInProduction = ['MONGODB_URI'];

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number.parseInt(process.env.PORT || '3000', 10),
  mongodbUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/bildyapp',
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
