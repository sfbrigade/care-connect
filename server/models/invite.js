import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import mailer from '#lib/mailer.js';
const { Prisma } = prismaPkg;

const InviteAttributesSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be between 2 and 30 characters long')
    .max(30, 'First name must be between 2 and 30 characters long'),
  lastName: z
    .string()
    .min(2, 'Last name must be between 2 and 30 characters long')
    .max(30, 'Last name must be between 2 and 30 characters long'),
  email: z.string().email('Please enter a valid email address.'),
  message: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),
  titleId: z.string().nullable().optional(),
  badgeNumber: z.string().nullable().optional(),
  prop115Certified: z.boolean().default(false),
});

const InviteResponseSchema = InviteAttributesSchema.extend({
  id: z.string().uuid(),
  updatedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  createdById: z.string().uuid(),
  acceptedAt: z.coerce.date().nullable(),
  acceptedById: z.string().uuid().nullable(),
  revokedAt: z.coerce.date().nullable(),
  revokedById: z.string().uuid().nullable(),
  expiresAt: z.coerce.date().nullable(),
});

class Invite extends Base {
  static AttibutesSchema = InviteAttributesSchema;
  static ResponseSchema = InviteResponseSchema;

  constructor (data) {
    super(Prisma.InviteScalarFieldEnum, data);
  }

  get isValid () {
    return !this.isAccepted && !this.isRevoked && !this.isExpired;
  }

  get isAccepted () {
    return !!this.acceptedAt;
  }

  get isRevoked () {
    return !!this.revokedAt;
  }

  get isExpired () {
    return !!this.expiresAt && new Date(this.expiresAt) < new Date() && !this.acceptedAt && !this.revokedAt;
  }

  get fullNameAndEmail () {
    return `${this.firstName ?? ''} ${this.lastName ?? ''} <${this.email}>`
      .trim()
      .replace(/ {2,}/g, ' ');
  }

  async sendInviteEmail (facility) {
    const { firstName, message } = this;
    const url = facility?.baseURL ?? new URL(process.env.BASE_URL);
    url.pathname = `/invites/${this.id}`;
    return mailer.send({
      message: {
        to: this.fullNameAndEmail,
      },
      template: 'invite',
      locals: {
        firstName,
        message,
        url: url.toString(),
      },
    });
  }
}

export { Invite };

export default Invite;
