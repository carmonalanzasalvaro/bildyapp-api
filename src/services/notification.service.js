import { EventEmitter } from 'node:events';

class NotificationService extends EventEmitter {}

const notificationService = new NotificationService();

notificationService.on('user:registered', ({ userId, email }) => {
  console.log(`[event] user:registered -> ${userId} (${email})`);
});

notificationService.on('user:verified', ({ userId, email }) => {
  console.log(`[event] user:verified -> ${userId} (${email})`);
});

notificationService.on('user:invited', ({ userId, email }) => {
  console.log(`[event] user:invited -> ${userId} (${email})`);
});

notificationService.on('user:deleted', ({ userId, email }) => {
  console.log(`[event] user:deleted -> ${userId} (${email})`);
});

export default notificationService;