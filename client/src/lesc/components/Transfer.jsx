import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useSearchParams, useNavigate } from 'react-router';
import { Container, Stack, Title, Text, Button, Group, Loader, Alert, Card, TextInput } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconQrcode } from '@tabler/icons-react';
import { DateTime } from 'luxon';

import Api from '@/Api';
import LESCFacility from './LESCFacility';
import QRScanner from '@/components/QRScanner';
import { useToast } from '@/components/ToastContext';
import { formatTime } from '@/utils/dateTime';

/**
 * Transfer page component
 * Route: /transfer/:holdId?token=:token
 * Can be accessed via:
 * - Direct URL (from scanned QR code)
 * - Manual entry (holdId + token)
 */
export default function Transfer () {
  const { holdId: holdIdParam } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [holdId, setHoldId] = useState(holdIdParam || '');
  const [token, setToken] = useState(searchParams.get('token') || '');
  const [showScanner, setShowScanner] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);

  // Fetch hold details from holds list to get full hold info
  const { data: holdsData, isLoading: isLoadingHolds } = useQuery({
    queryKey: ['lesc-holds'],
    queryFn: async () => {
      const response = await Api.lesc.holds.list();
      return response.data;
    },
    enabled: !!holdId && !manualEntry,
  });

  // Find the specific hold
  const holdData = holdsData?.find(h => h.id === holdId);

  // Fetch transfer status
  const { data: transferStatusData } = useQuery({
    queryKey: ['hold-transfer-status', holdId],
    queryFn: async () => {
      const response = await Api.lesc.holds.transferStatus(holdId);
      return response.data;
    },
    enabled: !!holdId && !manualEntry,
  });

  // Fetch facility details if we have hold data
  const { data: facilitiesData } = useQuery({
    queryKey: ['lesc-facilities'],
    queryFn: async () => {
      const response = await Api.lesc.availability();
      return response.data;
    },
    enabled: !!holdData,
  });

  const transferMutation = useMutation({
    mutationFn: async ({ id, transferToken }) => {
      return Api.lesc.holds.transfer(id, transferToken);
    },
    onSuccess: () => {
      showToast('Hold transferred successfully', 'success');
      queryClient.invalidateQueries({ queryKey: ['lesc-holds'] });
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
      // Redirect to holds list after a short delay
      setTimeout(() => {
        navigate('/holds');
      }, 2000);
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || 'Failed to transfer hold';
      showToast(errorMessage, 'error');
    },
  });

  const handleQRScan = (decodedText) => {
    try {
      // Parse URL: /transfer/:holdId?token=:token
      const url = new URL(decodedText);
      const pathParts = url.pathname.split('/');
      const holdIdFromQR = pathParts[pathParts.length - 1];
      const tokenFromQR = url.searchParams.get('token');

      if (holdIdFromQR && tokenFromQR) {
        setHoldId(holdIdFromQR);
        setToken(tokenFromQR);
        setShowScanner(false);
        setSearchParams({ token: tokenFromQR });
      } else {
        showToast('Invalid QR code format', 'error');
      }
    } catch (err) {
      showToast('Invalid QR code', 'error');
    }
  };

  const handleManualSubmit = () => {
    if (!holdId || !token) {
      showToast('Please enter both Hold ID and Token', 'error');
      return;
    }
    setSearchParams({ token });
    setManualEntry(false);
  };

  const handleTransfer = () => {
    if (!holdId || !token) {
      showToast('Missing hold ID or token', 'error');
      return;
    }
    transferMutation.mutate({ id: holdId, transferToken: token });
  };

  // If hold is already transferred, show message
  if (transferStatusData?.isTransferred) {
    return (
      <Container size='md' py='xl'>
        <Stack gap='md'>
          <Alert icon={<IconAlertCircle size={16} />} color='yellow' title='Already Transferred'>
            This hold has already been transferred.
            {transferStatusData.transferredAt && (
              <Text size='sm' mt='xs'>
                Transferred at: {DateTime.fromISO(transferStatusData.transferredAt).toLocaleString(DateTime.DATETIME_MED)}
              </Text>
            )}
          </Alert>
          <Button onClick={() => navigate('/holds')}>
            Back to Holds
          </Button>
        </Stack>
      </Container>
    );
  }

  const facility = facilitiesData?.facilities?.find(f => f.id === holdData?.facilityId);

  return (
    <Container size='md' py='xl'>
      <Stack gap='lg'>
        <Title order={2}>Transfer Bed Hold</Title>

        {!holdId && !showScanner && !manualEntry && (
          <Stack gap='md'>
            <Text>Scan a QR code or enter hold details manually.</Text>
            <Group>
              <Button
                leftSection={<IconQrcode size={16} />}
                onClick={() => setShowScanner(true)}
              >
                Scan QR Code
              </Button>
              <Button
                variant='outline'
                onClick={() => setManualEntry(true)}
              >
                Enter Manually
              </Button>
            </Group>
          </Stack>
        )}

        {showScanner && (
          <Card p='md'>
            <Stack gap='md'>
              <Text fw={500}>Scan QR Code</Text>
              <QRScanner
                onScanSuccess={handleQRScan}
                onScanError={(err) => {
                  if (!err.includes('No QR code found')) {
                    showToast(err, 'error');
                  }
                }}
              />
              <Button variant='outline' onClick={() => setShowScanner(false)}>
                Cancel
              </Button>
            </Stack>
          </Card>
        )}

        {manualEntry && (
          <Card p='md'>
            <Stack gap='md'>
              <Text fw={500}>Enter Hold Details</Text>
              <TextInput
                label='Hold ID'
                placeholder='Enter hold ID'
                value={holdId}
                onChange={(e) => setHoldId(e.target.value)}
              />
              <TextInput
                label='Transfer Token'
                placeholder='Enter transfer token'
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
              <Group>
                <Button onClick={handleManualSubmit}>
                  Continue
                </Button>
                <Button variant='outline' onClick={() => setManualEntry(false)}>
                  Cancel
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {holdId && token && !showScanner && !manualEntry && (
          <>
            {isLoadingHolds && (
              <Group justify='center' p='xl'>
                <Loader />
              </Group>
            )}

            {holdData && facility && (
              <Stack gap='md'>
                <Card p='md'>
                  <Stack gap='sm'>
                    <Text fw={500} size='lg'>Hold Details</Text>
                    <LESCFacility facility={facility} />
                    <Group>
                      <Text size='sm' c='dimmed'>Hold ID:</Text>
                      <Text size='sm' fw={500}>{holdId}</Text>
                    </Group>
                    {holdData.expiresAt && (
                      <Group>
                        <Text size='sm' c='dimmed'>Expires:</Text>
                        <Text size='sm'>{formatTime(holdData.expiresAt)}</Text>
                      </Group>
                    )}
                  </Stack>
                </Card>

                <Alert icon={<IconAlertCircle size={16} />} color='blue'>
                  <Text size='sm'>
                    Confirm that you want to transfer this hold. This action cannot be undone.
                  </Text>
                </Alert>

                <Group>
                  <Button
                    onClick={handleTransfer}
                    loading={transferMutation.isPending}
                    leftSection={<IconCheck size={16} />}
                  >
                    Confirm Transfer
                  </Button>
                  <Button variant='outline' onClick={() => navigate('/holds')}>
                    Cancel
                  </Button>
                </Group>
              </Stack>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
