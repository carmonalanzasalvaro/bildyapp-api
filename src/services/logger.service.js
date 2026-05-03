import config from '../config/index.js';

const buildSlackFields = ({ timestamp, method, route, status, message, stack }) => {
  const fields = [
    { title: 'Timestamp', value: timestamp, short: true },
    { title: 'Method', value: method, short: true },
    { title: 'Route', value: route, short: false },
    { title: 'Status', value: String(status), short: true },
    { title: 'Message', value: message, short: false }
  ];

  if (stack) {
    fields.push({ title: 'Stack', value: stack, short: false });
  }

  return fields;
};

const postToSlack = async (payload) => {
  if (!config.slackWebhookUrl) {
    return false;
  }

  try {
    const fetchFn = globalThis.fetch?.bind(globalThis);

    if (!fetchFn) {
      return false;
    }

    const response = await fetchFn(config.slackWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch {
    return false;
  }
};

export const loggerService = {
  async logServerError({ timestamp, method, route, status, message, stack }) {
    const payload = {
      text: `BildyApp 5XX: ${status} ${method} ${route}`,
      attachments: [
        {
          color: 'danger',
          fields: buildSlackFields({ timestamp, method, route, status, message, stack })
        }
      ]
    };

    return postToSlack(payload);
  }
};
