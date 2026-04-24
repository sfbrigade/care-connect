export const FACILITY_LIVE_REFETCH_INTERVAL_MS = 3000;

export const facilityLiveQueryOptions = {
  refetchInterval: FACILITY_LIVE_REFETCH_INTERVAL_MS,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchOnMount: 'always',
};
