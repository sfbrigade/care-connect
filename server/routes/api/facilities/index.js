import { StatusCodes } from 'http-status-codes';
import { z } from 'zod';

const sampleFacilities = [
  {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Psychiatric Emergency Services',
    description: 'ZSFG Psychiatry Emergency Services (PES)',
    latitude: 37.7557,
    longitude: -122.4044,
  },
  {
    id: '22222222-2222-4222-8222-222222222222',
    name: 'Geary Stabilization Unit',
    description: 'Crisis Diversion @ 822 Geary',
    latitude: 37.7868,
    longitude: -122.4162,
  },
  {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Progress Foundation Dore Clinic',
    description: 'Dore Urgent Care Center (DUCC)',
    latitude: 37.7724,
    longitude: -122.4156,
  },
  {
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Hummingbird - Potrero',
    description: 'PRC Baker Places Hummingbird Place Peer Respite Potrero',
    latitude: 37.7566,
    longitude: -122.4048,
  },
  {
    id: '55555555-5555-4555-8555-555555555555',
    name: 'Hummingbird - Valencia',
    description: 'PRC Baker Places Hummingbird Place Peer Respite Valencia',
    latitude: 37.7527,
    longitude: -122.4202,
  },
  {
    id: '66666666-6666-4666-8666-666666666666',
    name: 'SoMa RISE',
    description: 'HealthRight 360 SoMa Recovery Initiate Support Engage',
    latitude: 37.7781,
    longitude: -122.4109,
  },
  {
    id: '77777777-7777-4777-8777-777777777777',
    name: 'SF Sobering Center',
    description: 'SFDPH Sobering Center',
    latitude: 37.7766,
    longitude: -122.4132,
  },
  {
    id: '88888888-8888-4888-8888-888888888888',
    name: "A Woman's Place",
    description: "Community Forward SF - A Woman's Place Drop-In Center",
    latitude: 37.7789,
    longitude: -122.4118,
  },
  {
    id: '99999999-9999-4999-8999-999999999999',
    name: 'Edgewood Crisis Stabilization Unit',
    description: 'Edgewood Center for Children and Families',
    latitude: 37.7409,
    longitude: -122.4858,
  },
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'HR360 Withdrawal Management',
    description: 'HealthRight 360 Adult Residential Withdrawal Management',
    latitude: 37.7712,
    longitude: -122.4206,
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'SOMA Stabilization Center',
    description: 'Kean Stabilization Center (Eleanora Fagan Center)',
    latitude: 37.7772,
    longitude: -122.4113,
  },
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    name: 'Crystal Hotel Shelter',
    description: 'Crystal Hotel Transitional Housing',
    latitude: 37.7604,
    longitude: -122.4191,
  },
  {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    name: 'Oaktree Hotel Shelter',
    description: 'Oaktree Hotel Transitional Housing',
    latitude: 37.7746,
    longitude: -122.4214,
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    name: 'Eddy Hotel Shelter',
    description: 'Eddy Hotel Transitional Housing',
    latitude: 37.7838,
    longitude: -122.4145,
  },
  {
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    name: '16th Street Hotel Shelter',
    description: '16th Street Hotel Transitional Housing',
    latitude: 37.7644,
    longitude: -122.4196,
  },
  {
    id: '10101010-1010-4101-8101-101010101010',
    name: 'Safe Sleep Village',
    description: 'Gubbio Project Safe Sleep Site',
    latitude: 37.7642,
    longitude: -122.4198,
  },
  {
    id: '11112222-3333-4333-8333-222233334444',
    name: 'Hospitality House Tenderloin',
    description: 'Hospitality House - Tenderloin Self-Help Center',
    latitude: 37.7847,
    longitude: -122.4116,
  },
  {
    id: '55554444-3333-4222-8222-111100009999',
    name: 'Hospitality House 6th Street',
    description: 'Hospitality House - 6th Street Self Help Center+',
    latitude: 37.7815,
    longitude: -122.4098,
  },
  {
    id: 'abababab-abab-4aba-8aba-abababababab',
    name: 'Community Living Room',
    description: 'SF Community Living Room Drop-In',
    latitude: 37.7842,
    longitude: -122.4190,
  },
  {
    id: 'cdcdcdcd-cdcd-4cdc-8dcd-cdcdcdcdcdcd',
    name: 'Psychiatric Respite - A Woman’s Place Safe Sleep',
    description: 'Community Forward SF Safe Sleep',
    latitude: 37.7771,
    longitude: -122.4141,
  },
  {
    id: 'efefefef-efef-4efe-8fef-efefefefefef',
    name: 'ReleaseHub Demo Shelter',
    description: 'ReleaseHub Transitional Demo Site',
    latitude: 37.7688,
    longitude: -122.4226,
  }
];

export default async function (fastify, opts) {
  fastify.get('/',
    {
      schema: {
        description: 'Returns a list of facilities with basic metadata.',
        response: {
          [StatusCodes.OK]: z.array(z.object({
            id: z.string().uuid(),
            name: z.string(),
            description: z.string().nullable(),
            latitude: z.coerce.number().nullable(),
            longitude: z.coerce.number().nullable(),
          })),
        },
      },
    },
    async function (request, reply) {
      // Uncomment when ready to serve live data:
      // const facilities = await fastify.prisma.facility.findMany({
      //   orderBy: { name: 'asc' },
      //   select: {
      //     id: true,
      //     name: true,
      //     description: true,
      //     latitude: true,
      //     longitude: true,
      //   },
      // });
      // if (facilities.length > 0) {
      //   return reply.send(facilities);
      // }
      reply.send(sampleFacilities);
    });
}
