import { fn } from 'storybook/test';
import { Stack, Group, Button } from '@mantine/core';
import LESCCard from '../Components/LESCCard';
import Chip from '../Components/Chip';
import Card from '../Components/Card';
import { IconLock, IconClock, IconX } from '@tabler/icons-react';

export default {
  title: 'LESC/Availability',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

// Mock data
const mockFacility = {
  facilityName: 'LESC',
  address: '123 Main St, San Francisco',
  bedCount: 10,
  status: 'open',
  intakeHours: '24/7',
};

const mockAvailabilityData = [
  {
    facilityId: '1',
    facilityName: 'LESC',
    serviceTypeId: '1',
    serviceTypeName: 'Sobering',
    totalBeds: 10,
    availableBeds: 8,
    reservedBeds: 0,
    activeHolds: 2,
    calculatedAvailable: 8,
  },
];

const mockHolds = [
  {
    id: '1',
    facilityId: '1',
    serviceTypeId: '1',
    bedsRequested: 2,
    expiresAt: new Date(Date.now() + 59 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
  },
];

export const Default = {
  render: () => (
    <div style={{ padding: '20px', maxWidth: '375px', margin: '0 auto' }}>
      <Stack gap='16px'>
        <LESCCard
          facilityName={mockFacility.facilityName}
          address={mockFacility.address}
          bedCount={mockFacility.bedCount}
          status={mockFacility.status}
          intakeHours={mockFacility.intakeHours}
          lastUpdated='10:42 AM'
        />

        <Group gap='8px'>
          <Chip active onClick={fn()}>Current holds</Chip>
          <Chip active={false} onClick={fn()}>This week</Chip>
          <Chip active={false} onClick={fn()}>History</Chip>
        </Group>

        {mockAvailabilityData.map((item) => (
          <Card
            key={item.facilityId}
            title={item.facilityName}
            subtitle={item.serviceTypeName}
            badgeStatus='open'
            details={`${item.calculatedAvailable} Available`}
            actions={
              <Button
                leftSection={<IconLock size={18} />}
                onClick={fn()}
                variant='light'
              >
                Hold
              </Button>
            }
          />
        ))}
      </Stack>
    </div>
  ),
};

export const WithActiveHolds = {
  render: () => (
    <div style={{ padding: '20px', maxWidth: '375px', margin: '0 auto' }}>
      <Stack gap='16px'>
        <LESCCard
          facilityName={mockFacility.facilityName}
          address={mockFacility.address}
          bedCount={mockFacility.bedCount}
          status={mockFacility.status}
          intakeHours={mockFacility.intakeHours}
          lastUpdated='10:42 AM'
        />

        <Group gap='8px'>
          <Chip active onClick={fn()}>Current holds</Chip>
          <Chip active={false} onClick={fn()}>This week</Chip>
          <Chip active={false} onClick={fn()}>History</Chip>
        </Group>

        {mockHolds.map((hold) => (
          <Card
            key={hold.id}
            timeRemaining='59 mins'
            timeUntil='Until 11:15 AM'
            badgeStatus='active'
            details='Details/Notes ????'
            actions={
              <>
                <Button
                  leftSection={<IconClock size={18} />}
                  variant='light'
                  size='sm'
                  onClick={fn()}
                >
                  Extend 30 min
                </Button>
                <Button
                  leftSection={<IconX size={18} />}
                  variant='light'
                  color='red'
                  size='sm'
                  onClick={fn()}
                >
                  Cancel
                </Button>
              </>
            }
          />
        ))}

        {mockAvailabilityData.map((item) => (
          <Card
            key={item.facilityId}
            title={item.facilityName}
            subtitle={item.serviceTypeName}
            badgeStatus='open'
            details={`${item.calculatedAvailable} Available`}
            actions={
              <Button
                leftSection={<IconLock size={18} />}
                onClick={fn()}
                variant='light'
              >
                Hold
              </Button>
            }
          />
        ))}
      </Stack>
    </div>
  ),
};

export const EmptyState = {
  render: () => (
    <div style={{ padding: '20px', maxWidth: '375px', margin: '0 auto' }}>
      <Stack gap='16px'>
        <LESCCard
          facilityName={mockFacility.facilityName}
          address={mockFacility.address}
          bedCount={0}
          status='closed'
          intakeHours='24/7'
          lastUpdated='10:42 AM'
        />

        <Group gap='8px'>
          <Chip active onClick={fn()}>Current holds</Chip>
          <Chip active={false} onClick={fn()}>This week</Chip>
          <Chip active={false} onClick={fn()}>History</Chip>
        </Group>

        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#868e96' }}>
          No LESC facilities found.
        </div>
      </Stack>
    </div>
  ),
};
