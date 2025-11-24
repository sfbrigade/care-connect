import { fn } from 'storybook/test';
import { Stack, Group, Title, Button } from '@mantine/core';
import { IconPlus, IconClock, IconX } from '@tabler/icons-react';
import Card from '../Components/Card';

export default {
  title: 'LESC/Holds',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

const mockHolds = [
  {
    id: '1',
    facilityName: 'LESC',
    serviceTypeName: 'Sobering',
    bedsRequested: 2,
    expiresAt: new Date(Date.now() + 59 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    notes: '2 individuals sobering',
  },
  {
    id: '2',
    facilityName: 'LESC',
    serviceTypeName: 'Sobering',
    bedsRequested: 1,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    status: 'ACTIVE',
    notes: null,
  },
];

const formatTimeRemaining = (expiresAt) => {
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - Date.now();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 0) return 'Expired';
  if (diffMins < 60) return `${diffMins} mins`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
};

const formatTimeUntil = (expiresAt) => {
  const expires = new Date(expiresAt);
  const hours = expires.getHours();
  const minutes = expires.getMinutes();
  const ampm = hours >= 12 ? 'AM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes.toString().padStart(2, '0');
  return `Until ${displayHours}:${displayMinutes} ${ampm}`;
};

export const Default = {
  render: () => (
    <div style={{ padding: '20px', maxWidth: '375px', margin: '0 auto' }}>
      <Stack gap='16px'>
        <Group justify='space-between'>
          <Title order={2}>Active Bed Holds</Title>
          <Button leftSection={<IconPlus size={18} />} onClick={fn()}>
            Create Hold
          </Button>
        </Group>

        <Stack gap='16px'>
          {mockHolds.map((hold) => {
            const isExpiringSoon = new Date(hold.expiresAt).getTime() - Date.now() < 15 * 60 * 1000;

            return (
              <Card
                key={hold.id}
                timeRemaining={formatTimeRemaining(hold.expiresAt)}
                timeUntil={formatTimeUntil(hold.expiresAt)}
                badgeStatus={isExpiringSoon ? 'warning' : 'active'}
                details={hold.notes || 'Details/Notes ????'}
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
            );
          })}
        </Stack>
      </Stack>
    </div>
  ),
};

export const EmptyState = {
  render: () => (
    <div style={{ padding: '20px', maxWidth: '375px', margin: '0 auto' }}>
      <Stack gap='16px'>
        <Group justify='space-between'>
          <Title order={2}>Active Bed Holds</Title>
          <Button leftSection={<IconPlus size={18} />} onClick={fn()}>
            Create Hold
          </Button>
        </Group>

        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#868e96' }}>
          No active holds.
        </div>
      </Stack>
    </div>
  ),
};

export const ExpiringSoon = {
  render: () => {
    const expiringHold = {
      id: '1',
      facilityName: 'LESC',
      serviceTypeName: 'Sobering',
      bedsRequested: 2,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      status: 'ACTIVE',
      notes: 'Expiring soon',
    };

    return (
      <div style={{ padding: '20px', maxWidth: '375px', margin: '0 auto' }}>
        <Stack gap='16px'>
          <Group justify='space-between'>
            <Title order={2}>Active Bed Holds</Title>
            <Button leftSection={<IconPlus size={18} />} onClick={fn()}>
              Create Hold
            </Button>
          </Group>

          <Card
            timeRemaining={formatTimeRemaining(expiringHold.expiresAt)}
            timeUntil={formatTimeUntil(expiringHold.expiresAt)}
            badgeStatus='warning'
            details={expiringHold.notes}
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
        </Stack>
      </div>
    );
  },
};
