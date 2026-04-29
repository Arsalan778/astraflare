import mongoose from 'mongoose';
import logger from './logger.js';

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/astraflare';

  mongoose.set('strictQuery', false);

  mongoose.connection.on('connected', () =>
    logger.info('✅  MongoDB connected')
  );
  mongoose.connection.on('error', (err) =>
    logger.error('MongoDB error', err)
  );
  mongoose.connection.on('disconnected', () =>
    logger.warn('MongoDB disconnected')
  );

  await mongoose.connect(uri, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  });
}

export async function disconnectDB() {
  await mongoose.disconnect();
}