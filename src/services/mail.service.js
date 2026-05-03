import nodemailer from 'nodemailer';
import config from '../config/index.js';

let transporter;

const createTransporter = () => {
  if (transporter) {
    return transporter;
  }

  if (config.mailtrapHost && config.mailtrapUser && config.mailtrapPass) {
    transporter = nodemailer.createTransport({
      host: config.mailtrapHost,
      port: config.mailtrapPort,
      auth: {
        user: config.mailtrapUser,
        pass: config.mailtrapPass
      }
    });

    return transporter;
  }

  transporter = nodemailer.createTransport({
    streamTransport: true,
    newline: 'unix',
    buffer: true
  });

  return transporter;
};

export const mailService = {
  async sendVerificationEmail({ to, code }) {
    const transport = createTransporter();

    return transport.sendMail({
      from: config.mailFrom,
      to,
      subject: 'Verifica tu cuenta de BildyApp',
      text: `Tu código de verificación es ${code}`,
      html: `<p>Tu código de verificación es <strong>${code}</strong></p>`
    });
  }
};

export const resetMailTransport = () => {
  transporter = null;
};
