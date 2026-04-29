import prismaPkg from '@prisma/client';
import { z } from 'zod';

import Base from './base.js';
import Amenity from './amenity.js';
import BedType from './bedType.js';
import FacilityContact from './facilityContact.js';
import FacilityEligibility from './facilityEligibility.js';
import FacilityStatusReason from './facilityStatusReason.js';
import ServiceType from './serviceType.js';
import User from './user.js';
const { Prisma, FacilityStatusEnum, FacilityTypeEnum, FacilityUpdateMethodEnum } = prismaPkg;

const FacilityAttributesSchema = z.object({
  name: z.string(),
  type: z.enum(Object.values(FacilityTypeEnum)),
  serviceTypeId: z.string(),
  subdomain: z.string().nullable(),
  description: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  website: z.string().nullable(),
  addressLine1: z.string().nullable(),
  addressLine2: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  neighborhood: z.string().nullable(),
  nstDistrict: z.string().nullable(),
  latitude: z.coerce.number().nullable(),
  longitude: z.coerce.number().nullable(),
  isActive: z.boolean(),
});

const FacilityResponseSchema = FacilityAttributesSchema.extend({
  id: z.string().uuid(),
  serviceType: ServiceType.ResponseSchema.optional(),
  status: z.enum(Object.values(FacilityStatusEnum)),
  statusReason: FacilityStatusReason.ResponseSchema.nullable().optional(),
  statusReasonId: z.string().nullable(),
  statusOther: z.string().nullable(),
  updateMethod: z.enum(Object.values(FacilityUpdateMethodEnum)),
  updateNotes: z.string().nullable(),
  bedTypes: z.array(BedType.ResponseSchema).optional(),
  amenities: z.array(Amenity.ResponseSchema).optional(),
  eligibility: z.array(FacilityEligibility.ResponseSchema).optional(),
  contacts: z.array(FacilityContact.ResponseSchema).optional(),
  createdAt: z.coerce.date(),
  createdBy: User.ResponseSchema.optional(),
  createdById: z.string().uuid(),
  updatedAt: z.coerce.date(),
  updatedBy: User.ResponseSchema.optional(),
  updatedById: z.string().uuid(),
});

const FacilityUpdateSchema = FacilityAttributesSchema.partial();

export class Facility extends Base {
  static Status = FacilityStatusEnum;
  static Type = FacilityTypeEnum;
  static UpdateMethod = FacilityUpdateMethodEnum;
  static ResponseSchema = FacilityResponseSchema;
  static UpdateSchema = FacilityUpdateSchema;

  constructor (data) {
    super(Prisma.FacilityScalarFieldEnum, data);
  }

  get baseURL () {
    const url = new URL(process.env.BASE_URL);
    url.hostname = `${this.subdomain}.${url.hostname}`;
    return url;
  }
}

export default Facility;
