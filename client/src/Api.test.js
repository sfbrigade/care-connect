import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGet = vi.hoisted(() => vi.fn());

vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: mockGet,
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    }),
  },
}));

describe('Api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ data: [] });
  });

  it('passes status through deflections list params', async () => {
    const Api = (await import('./Api')).default;

    await Api.deflections.list({
      facilityId: 'facility-1',
      subjectStatus: 'DETAINED',
      status: 'ACTIVE',
      includeIncident: true,
      perPage: 200,
    });

    expect(mockGet).toHaveBeenCalledWith('/api/deflections', {
      params: {
        facilityId: 'facility-1',
        includeIncident: 'true',
        subjectStatus: 'DETAINED',
        status: 'ACTIVE',
        perPage: 200,
      },
    });
  });
});
