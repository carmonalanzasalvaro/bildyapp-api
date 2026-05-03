import http from 'node:http';
import app from './app.js';
import config from './config/index.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';

let server;

export const startServer = async () => {
  await connectDatabase();

  server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(config.port, () => {
      console.log(`🚀 BildyApp API escuchando en http://localhost:${config.port}`);
      resolve();
    });
  });

  return server;
};

export const stopServer = async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await disconnectDatabase();
};

const shutdown = async (signal) => {
  try {
    console.log(`\n${signal} recibido. Cerrando servidor...`);
    await stopServer();
    process.exit(0);
  } catch (error) {
    console.error('Error durante el apagado:', error.message);
    process.exit(1);
  }
};

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

const isMainModule = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (isMainModule) {
  startServer().catch((error) => {
    console.error('No se pudo iniciar la aplicación:', error.message);
    process.exit(1);
  });
}
