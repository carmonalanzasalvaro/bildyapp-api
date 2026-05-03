let io;

export const COMPANY_ROOM_PREFIX = 'company:';

export const getCompanyRoom = (companyId) => `${COMPANY_ROOM_PREFIX}${companyId.toString()}`;

export const setSocketServer = (socketServer) => {
  io = socketServer;
  return io;
};

export const getSocketServer = () => io;

export const clearSocketServer = () => {
  io = undefined;
};

export const emitCompanyEvent = (companyId, eventName, payload) => {
  if (!io || !companyId) {
    return false;
  }

  io.to(getCompanyRoom(companyId)).emit(eventName, payload);
  return true;
};
