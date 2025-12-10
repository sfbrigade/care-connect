import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Modal, Stack, Text, Button, Group, Loader, Alert } from '@mantine/core';
import { IconRefresh, IconClock, IconAlertCircle } from '@tabler/icons-react';
import { DateTime } from 'luxon';

import Api from '@/Api';
import QRCode from '@/components/QRCode';
import { useToast } from '@/components/ToastContext';

/**
 * Component for displaying QR code for a bed hold
 * Shows QR code, expiration countdown, and refresh button
 */
export default function HoldQRCode ({ holdId, opened, onClose, onDone }) {
  const [expiresAt, setExpiresAt] = useState(null);
  const { showToast } = useToast();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['hold-qr', holdId],
    queryFn: async () => {
      const response = await Api.lesc.holds.qr(holdId);
      return response.data;
    },
    enabled: opened && !!holdId,
  });

  // Update expiration time when data changes
  useEffect(() => {
    if (data?.expiresAt) {
      setExpiresAt(DateTime.fromISO(data.expiresAt));
    }
  }, [data]);

  // Countdown timer
  const [timeRemaining, setTimeRemaining] = useState(null);
  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const now = DateTime.now();
      const diff = expiresAt.diff(now);
      if (diff.as('seconds') > 0) {
        const minutes = Math.floor(diff.as('minutes'));
        const seconds = Math.floor(diff.as('seconds') % 60);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      } else {
        setTimeRemaining('Expired');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  const handleRefresh = async () => {
    try {
      await refetch();
      showToast('QR code refreshed', 'success');
    } catch (err) {
      showToast('Failed to refresh QR code', 'error');
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title='Transfer QR Code'
      size='md'
      centered
    >
      <Stack gap='md'>
        {isLoading && (
          <Group justify='center' p='xl'>
            <Loader />
          </Group>
        )}

        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color='red'>
            {error.response?.data?.error || 'Failed to generate QR code'}
          </Alert>
        )}

        {data && (
          <>
            <Stack align='center' gap='md'>
              <QRCode value={data.qrUrl} size={256} />
              <Text size='sm' c='dimmed' ta='center'>
                Scan this QR code to transfer the hold
              </Text>
            </Stack>

            {timeRemaining && (
              <Group justify='space-between' p='md' style={{ backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <Group gap='xs'>
                  <IconClock size={16} />
                  <Text size='sm' fw={500}>
                    Expires in: {timeRemaining}
                  </Text>
                </Group>
              </Group>
            )}

            <Group justify='space-between'>
              <Button
                variant='outline'
                leftSection={<IconRefresh size={16} />}
                onClick={handleRefresh}
              >
                Refresh QR Code
              </Button>
              <Button
                onClick={() => {
                  if (onDone) {
                    onDone();
                  }
                  onClose();
                }}
              >
                Done
              </Button>
            </Group>
          </>
        )}
      </Stack>
    </Modal>
  );
}
