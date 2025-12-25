import { useQuery } from '@tanstack/react-query';
import { Container, Stack, Loader, Alert } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useNavigate } from 'react-router';
import { useMemo } from 'react';

import Api from '@/Api';
import LESCFacility from './LESCFacility';
import { formatTime } from '@/utils/dateTime';

function Facilities () {
  const navigate = useNavigate();

  // Fetch facilities for address and other metadata
  const { data: facilitiesData, isLoading: facilitiesLoading, error: facilitiesError } = useQuery({
    queryKey: ['lesc-facilities'],
    queryFn: async () => {
      const response = await Api.lesc.facilities.list();
      return response.data;
    },
  });

  // Fetch availability data which has accurate bed counts accounting for holds
  const { data: availabilityData, isLoading: availabilityLoading, error: availabilityError } = useQuery({
    queryKey: ['lesc-availability'],
    queryFn: async () => {
      const response = await Api.lesc.availability();
      return response.data;
    },
  });

  // Merge facilities with availability data
  const facilities = useMemo(() => {
    if (!facilitiesData || !availabilityData) return [];

    // Group availability by facility
    const availabilityByFacility = new Map();
    availabilityData.forEach((item) => {
      if (!availabilityByFacility.has(item.facilityId)) {
        availabilityByFacility.set(item.facilityId, {
          totalAvailable: 0,
          totalHolds: 0,
          facilityName: item.facilityName,
        });
      }
      const facilityData = availabilityByFacility.get(item.facilityId);
      facilityData.totalAvailable += item.calculatedAvailable ?? item.availableBeds ?? 0;
      facilityData.totalHolds += item.activeHolds ?? 0;
    });

    // Merge with facilities data and sort by bed count descending
    return facilitiesData
      .map((facility) => {
        const availability = availabilityByFacility.get(facility.id);
        return {
          ...facility,
          calculatedAvailableBeds: availability?.totalAvailable ?? 0,
          currentHolds: availability?.totalHolds ?? 0,
        };
      })
      .sort((a, b) => (b.calculatedAvailableBeds ?? 0) - (a.calculatedAvailableBeds ?? 0));
  }, [facilitiesData, availabilityData]);

  const isLoading = facilitiesLoading || availabilityLoading;
  const error = facilitiesError || availabilityError;

  const formatAddress = (facility) => {
    const parts = [];
    if (facility.address?.line1) parts.push(facility.address.line1);
    if (facility.address?.city) parts.push(facility.address.city);
    if (facility.address?.state) parts.push(facility.address.state);
    return parts.length > 0 ? parts.join(', ') : facility.neighborhood || 'Address not available';
  };

  if (isLoading) {
    return (
      <Container>
        <Loader />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert icon={<IconAlertCircle />} title='Error' color='red'>
          Failed to load facilities.
        </Alert>
      </Container>
    );
  }

  return (
    <Container>
      <Stack gap='md'>
        {facilities && facilities.length === 0
          ? (
            <Alert>No LESC facilities found.</Alert>
            )
          : (
              facilities?.map((facility) => {
                const availableBeds = facility.calculatedAvailableBeds ?? 0;
                const address = formatAddress(facility);

                return (
                  <LESCFacility
                    key={facility.id}
                    facilityName={facility.name}
                    address={address}
                    bedCount={availableBeds}
                    intakeHours='24/7'
                    lastUpdated={facility.updatedAt ? formatTime(new Date(facility.updatedAt)) : undefined}
                    onCurrentHoldsClick={() => navigate(`/holds/${facility.id}`)}
                    onCallClick={() => {
                    // TODO: Implement call functionality
                      console.log('Call facility:', facility.name);
                    }}
                    onHoldClick={() => navigate(`/holds/${facility.id}?create=true`)}
                  />
                );
              })
            )}
      </Stack>
    </Container>
  );
}

export default Facilities;
