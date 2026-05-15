import prismaPkg from '@prisma/client';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';

import Base from './base.js';
import mailer from '#lib/mailer.js';
import { formatUnitName } from '#lib/unitName.js';
import Organization from '#models/organization.js';
import Title from '#models/title.js';
import Unit from '#models/unit.js';
const { Prisma, RoleEnum } = prismaPkg;

const UserAttributesSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be between 2 and 30 characters long')
    .max(30, 'First name must be between 2 and 30 characters long'),
  lastName: z
    .string()
    .min(2, 'Last name must be between 2 and 30 characters long')
    .max(30, 'Last name must be between 2 and 30 characters long'),
  email: z.string().email('Please enter a valid email address.'),
  badgeNumber: z.string().nullable().optional(),
  prop115Certified: z.boolean().optional(),
  organizationId: z.string().nullable().optional(),
  titleId: z.string().nullable().optional(),
  unitId: z.string().nullable().optional(),
  roles: z.array(z.enum(Object.values(RoleEnum))).optional(),
});

const UserPasswordSchema = z
  .string()
  .min(12, 'Password must be at least 12 characters long');

const UserRegisterSchema = UserAttributesSchema.extend({
  password: UserPasswordSchema,
  inviteId: z.string().uuid().optional(),
});

const UserResponseSchema = UserAttributesSchema.extend({
  id: z.string().uuid(),
  picture: z.string().nullable(),
  pictureUrl: z.string().nullable().optional(),
  isAdmin: z.boolean(),
  organization: Organization.ResponseSchema.nullable().optional(),
  title: Title.ResponseSchema.nullable().optional(),
  unit: Unit.ResponseSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  deactivatedAt: z.coerce.date().nullable(),
  deletedAt: z.coerce.date().nullable(),
});

const UserNameResponseSchema = z.object({
  id: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
});

const UserUpdateSchema = UserAttributesSchema.extend({
  unitName: z.string().trim().min(1).optional(),
  password: z.never(),
  picture: z.string().nullable(),
  isAdmin: z.boolean(),
  deactivatedAt: z.coerce.date().nullable(),
  deletedAt: z.coerce.date().nullable(),
}).partial();

export class User extends Base {
  static BATCH_USER_ID = '00000000-0000-0000-0000-000000000000';
  static PasswordSchema = UserPasswordSchema;
  static RegisterSchema = UserRegisterSchema;
  static NameResponseSchema = UserNameResponseSchema;
  static ResponseSchema = UserResponseSchema;
  static UpdateSchema = UserUpdateSchema;

  static Role = RoleEnum;

  constructor (data) {
    if (data?.unit?.name) {
      data = {
        ...data,
        unit: {
          ...data.unit,
          name: formatUnitName(data.unit.name),
        },
      };
    }
    super(Prisma.UserScalarFieldEnum, data);
  }

  get isField () {
    return this.roles?.includes(User.Role.FIELD) ?? false;
  }

  get isCustody () {
    return this.roles?.includes(User.Role.CUSTODY) ?? false;
  }

  get isCare () {
    return this.roles?.includes(User.Role.CARE) ?? false;
  }

  get isOrgAdmin () {
    return this.roles.includes('ORG_ADMIN');
  }

  get isFacilityAdmin () {
    return this.roles?.includes(User.Role.FACILITY_ADMIN) ?? false;
  }

  get isDeleted () {
    return !!this.deletedAt;
  }

  get pictureUrl () {
    return this.getAssetUrl('picture');
  }

  get isActive () {
    return !this.deactivatedAt;
  }

  get isPasswordResetTokenValid () {
    return new Date() <= new Date(this.passwordResetExpiresAt);
  }

  get fullNameAndEmail () {
    return `${this.firstName} ${this.lastName} <${this.email}>`
      .trim()
      .replace(/ {2,}/g, ' ');
  }

  generatePasswordResetToken () {
    this.passwordResetToken = crypto.randomUUID();
  }

  async sendPasswordResetEmail (facility) {
    const { firstName } = this;
    const url = facility?.baseURL ?? new URL(process.env.BASE_URL);
    url.pathname = `/passwords/reset/${this.passwordResetToken}`;
    return mailer.send({
      message: {
        to: this.fullNameAndEmail,
      },
      template: 'password-reset',
      locals: {
        firstName,
        url: url.toString(),
      },
    });
  }

  async setPassword (password) {
    this.hashedPassword = await bcrypt.hash(password, 10);
  }

  async comparePassword (password) {
    return bcrypt.compare(password, this.hashedPassword);
  }

  async hasActiveHolds (prisma) {
    const count = await prisma.deflection.count({
      where: {
        currentOfficerId: this.id,
        status: 'ACTIVE',
        subjectStatus: { in: ['DETAINED', 'ONSITE_AWAITING_TRANSFER'] },
      },
    });
    return count > 0;
  }
}

export default User;
