import mongoose from 'mongoose';
import config from './index.js';

const connectionStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting'
};

export const connectDatabase = async (uri = config.mongodbUri) => {
  if (mongoose.connection.readyState !== 0) {
    const currentUri = mongoose.connection.client?.s?.url;

    if (currentUri === uri) {
      return mongoose.connection;
    }

    await mongoose.disconnect();
  }

  await mongoose.connect(uri);
  return mongoose.connection;
};

export const disconnectDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

export const getDatabaseStatus = () => {
  return connectionStates[mongoose.connection.readyState] || 'unknown';
};
