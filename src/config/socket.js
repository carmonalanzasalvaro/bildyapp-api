import { Server } from 'socket.io';
import AppError from '../utils/AppError.js';
import { extractAccessToken, resolveAuthenticatedUser } from '../middleware/auth.js';
import { getCompanyRoom, setSocketServer } from '../services/realtime.service.js';

const resolveSocketToken = (socket) => {
  const authToken = socket.handshake.auth?.token;

  if (typeof authToken === 'string' && authToken.trim()) {
    return authToken.trim();
  }

  const authorizationHeader = socket.handshake.headers?.authorization;
  return extractAccessToken(authorizationHeader);
};

const buildSocketError = (error) => {
  if (error instanceof AppError) {
    return Object.assign(new Error(error.message), {
      data: {
        code: error.code,
        statusCode: error.statusCode
      }
    });
  }

  return Object.assign(new Error('No se pudo autenticar el socket'), {
    data: {
      code: 'SOCKET_AUTH_ERROR',
      statusCode: 401
    }
  });
};

export const createSocketServer = (httpServer, app) => {
  const io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true
    }
  });

  io.use(async (socket, next) => {
    try {
      const token = resolveSocketToken(socket);
      const user = await resolveAuthenticatedUser(token);

      if (!user.company || user.company.deleted) {
        throw AppError.forbidden('Debes completar la compañía antes de continuar', 'NO_COMPANY');
      }

      socket.data.user = user;
      socket.data.companyId = user.company._id.toString();
      return next();
    } catch (error) {
      return next(buildSocketError(error));
    }
  });

  io.on('connection', (socket) => {
    socket.join(getCompanyRoom(socket.data.companyId));
  });

  setSocketServer(io);
  app?.set('io', io);

  return io;
};
