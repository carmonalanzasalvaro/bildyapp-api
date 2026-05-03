import http from 'node:http';
import app from './app.js';
import config from './config/index.js';
import { createSocketServer } from './config/socket.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { clearSocketServer } from './services/realtime.service.js';

let server;
let io;

export const startServer = async (options = {}) => {
  await connectDatabase();

  server = http.createServer(app);
  io = createSocketServer(server, app);
  const port = options.port ?? config.port;

  await new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`🚀 BildyApp API escuchando en http://localhost:${port}`);
      resolve();
    });
  });

  return server;
};

export const stopServer = async () => {
  if (io) {
    await io.close();
    io = undefined;
    clearSocketServer();
    app.set('io', undefined);
  }

  if (server?.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });

    server = undefined;
  } else {
    server = undefined;
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
