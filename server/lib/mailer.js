import crypto from 'crypto';
import Email from 'email-templates';
import nodemailer from 'nodemailer';

if (process.env.AWS_SES_REGION) {
  process.env.SMTP_HOST = `email-smtp.${process.env.AWS_SES_REGION}.amazonaws.com`;
  process.env.SMTP_PORT = 587;
  process.env.SMTP_USER = process.env.AWS_SES_ACCESS_KEY_ID;
  // convert secret access key to SMTP password
  // based on pseudocode at: https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html#smtp-credentials-convert
  const date = '11111111';
  const service = 'ses';
  const terminal = 'aws4_request';
  const message = 'SendRawEmail';
  const version = 4;
  let signature;
  signature = crypto
    .createHmac('sha256', `AWS4${process.env.AWS_SES_SECRET_ACCESS_KEY}`, {
      encoding: 'utf8',
    })
    .update(date)
    .digest();
  signature = crypto
    .createHmac('sha256', signature)
    .update(process.env.AWS_SES_REGION)
    .digest();
  signature = crypto.createHmac('sha256', signature).update(service).digest();
  signature = crypto.createHmac('sha256', signature).update(terminal).digest();
  signature = crypto.createHmac('sha256', signature).update(message).digest();
  signature = Buffer.concat([new Uint8Array([version]), signature]);
  process.env.SMTP_PASS = signature.toString('base64');
}

const options = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

let mailer;

export const EMAIL_TITLE = process.env.EMAIL_SITE_TITLE || 'City and County of San Francisco: CareConnect';
export const EMAIL_BASE_URL = process.env.EMAIL_BASE_URL || process.env.BASE_URL || 'https://careconnect.sf.gov';

export function configureMailer (lib) {
  const transport = lib.createTransport(options);

  const config = {
    message: {
      from: `"${EMAIL_TITLE}" <${process.env.SMTP_FROM_EMAIL_ADDRESS}>`,
    },
    send: true,
    preview: false,
    transport,
    views: {
      options: {
        extension: 'ejs',
      },
    },
    juice: false,
  };
  if (process.env.SMTP_REPLY_TO_EMAIL_ADDRESS) {
    config.message.replyTo = `"${EMAIL_TITLE}" <${process.env.SMTP_REPLY_TO_EMAIL_ADDRESS}>`;
  }

  mailer = new Email(config);
}

configureMailer(nodemailer);

async function send (options) {
  if (process.env.SMTP_ENABLED !== 'true') {
    return;
  }
  options.locals ||= {};
  options.locals._layout = {
    BASE_URL: EMAIL_BASE_URL,
    LOGO_URL: '',
    TITLE: EMAIL_TITLE,
  };
  return mailer.send(options);
}

export default { send };
