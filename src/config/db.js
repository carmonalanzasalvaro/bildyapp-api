import mongoose from 'mongoose';
import config from './index.js';

const connectDB = async () => {
  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(config.mongodbUri);
  console.log('MongoDB connected');
};

export default connectDB;