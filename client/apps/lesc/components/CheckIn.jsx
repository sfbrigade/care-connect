import { useState, useEffect } from 'react';
import { Container, Stack, Text, Group, Button, Card as MantineCard, Loader, Alert, TextInput } from '@mantine/core';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft, IconQrcode, IconAlertCircle } from '@tabler/icons-react';
import Card from '../../../core/components/Card';
import { formatTimeRemaining, formatTimeUntil } from '../../../core/utils/dateTime';
import Api from '../../../core/Api';
import QRScanner from '../../../core/components/QRScanner';
import { useToast } from '../../../core/components/ToastContext';
import LESCFacility from './LESCFacility';

/**
 * Check-in screen - matches Figma "Check-in" design
 * Allows scanning QR code or entering hold ID manually
 */
function CheckIn () {
  const navigate = useNavigate();
  const { holdId: holdIdParam } = useParams();
  const { showToast } = useToast();

  const [holdId, setHoldId] = useState(holdIdParam || '');
  const [showScanner, setShowScanner] = useState(!holdIdParam); // Auto-show scanner if no holdId
  const [manualEntry, setManualEntry] = useState(false);

  // Auto-show scanner when there's no holdId
  useEffect(() => {
    if (!holdIdParam && !manualEntry) {
      setShowScanner(true);
    }
  }, [holdIdParam, manualEntry]);

  // Fetch holds list to get the specific hold
  const { data: holdsData, isLoading: isLoadingHolds } = useQuery({
    queryKey: ['lesc-holds'],
    queryFn: async () => {
      const response = await Api.lesc.holds.list();
      return response.data;
    },
    enabled: !!holdId && !manualEntry,
  });

  // Find the specific hold
  const hold = holdsData?.find(h => h.id === holdId);

  // Fetch facility details if we have hold data
  const { data: facilitiesData } = useQuery({
    queryKey: ['lesc-facilities'],
    queryFn: async () => {
      const response = await Api.lesc.availability();
      return response.data;
    },
    enabled: !!hold,
  });

  const handleQRScan = (decodedText) => {
    try {
      // Parse URL: /lesc/transfer/:holdId?token=:token
      // For checkin, we just need the holdId from the transfer QR code
      const url = new URL(decodedText);
      const pathParts = url.pathname.split('/');
      const holdIdFromQR = pathParts[pathParts.length - 1];

      if (holdIdFromQR) {
        setHoldId(holdIdFromQR);
        setShowScanner(false);
        navigate(`/lesc/checkin/${holdIdFromQR}`, { replace: true });
      } else {
        showToast('Invalid QR code format', 'error');
      }
    } catch (err) {
      showToast('Invalid QR code', 'error');
    }
  };

  const handleManualSubmit = () => {
    if (!holdId) {
      showToast('Please enter Hold ID', 'error');
      return;
    }
    navigate(`/lesc/checkin/${holdId}`, { replace: true });
    setManualEntry(false);
  };

  const facility = facilitiesData?.facilities?.find(f => f.id === hold?.facilityId);

  // If no holdId, show QR scanner or manual entry
  if (!holdId || (manualEntry && !holdId)) {
    return (
      <Container>
        <Stack gap='md'>
          <Button
            leftSection={<IconArrowLeft size={18} />}
            variant='light'
            onClick={() => navigate(-1)}
            style={{ alignSelf: 'flex-start' }}
          >
            Back
          </Button>

          {!showScanner && !manualEntry && (
            <Stack gap="md">
              <Text>Scan a QR code or enter hold ID manually to check in.</Text>
              <Group>
                <Button
                  leftSection={<IconQrcode size={16} />}
                  onClick={() => setShowScanner(true)}
                >
                  Scan QR Code
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setManualEntry(true)}
                >
                  Enter Hold ID
                </Button>
              </Group>
            </Stack>
          )}

          {showScanner && (
            <MantineCard p="md">
              <Stack gap="md">
                <Text fw={500}>Scan QR Code</Text>
                <QRScanner
                  autoStart={true}
                  onScanSuccess={handleQRScan}
                  onScanError={(err) => {
                    if (!err.includes('No QR code found')) {
                      showToast(err, 'error');
                    }
                  }}
                />
                <Button variant="outline" onClick={() => setShowScanner(false)}>
                  Cancel
                </Button>
              </Stack>
            </MantineCard>
          )}

          {manualEntry && (
            <MantineCard p="md">
              <Stack gap="md">
                <Text fw={500}>Enter Hold ID</Text>
                <TextInput
                  label="Hold ID"
                  placeholder="Enter hold ID"
                  value={holdId}
                  onChange={(e) => setHoldId(e.target.value)}
                />
                <Group>
                  <Button onClick={handleManualSubmit}>
                    Continue
                  </Button>
                  <Button variant="outline" onClick={() => setManualEntry(false)}>
                    Cancel
                  </Button>
                </Group>
              </Stack>
            </MantineCard>
          )}
        </Stack>
      </Container>
    );
  }

  if (isLoadingHolds) {
    return (
      <Container>
        <Stack gap='md'>
          <Button
            leftSection={<IconArrowLeft size={18} />}
            variant='light'
            onClick={() => navigate(-1)}
            style={{ alignSelf: 'flex-start' }}
          >
            Back
          </Button>
          <Group justify="center" p="xl">
            <Loader />
          </Group>
        </Stack>
      </Container>
    );
  }

  if (!hold) {
    return (
      <Container>
        <Stack gap='md'>
          <Button
            leftSection={<IconArrowLeft size={18} />}
            variant='light'
            onClick={() => navigate(-1)}
            style={{ alignSelf: 'flex-start' }}
          >
            Back
          </Button>
          <Alert icon={<IconAlertCircle size={16} />} color="red" title="Hold Not Found">
            <Text size="sm">The hold with ID {holdId} was not found or may have expired.</Text>
          </Alert>
          <Button onClick={() => {
            setHoldId('');
            setManualEntry(false);
            setShowScanner(false);
          }}>
            Try Again
          </Button>
        </Stack>
      </Container>
    );
  }

  const expiresAt = new Date(hold.expiresAt);
  const diffMs = expiresAt.getTime() - Date.now();
  const diffMins = Math.floor(diffMs / 60000);
  const timeRemaining = diffMins < 60 ? `${diffMins} mins` : `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`;
  const timeUntil = formatTimeUntil(hold.expiresAt);

  return (
    <Container>
      <Stack gap='md'>
        <Button
          leftSection={<IconArrowLeft size={18} />}
          variant='light'
          onClick={() => navigate(-1)}
          style={{ alignSelf: 'flex-start' }}
        >
          Back
        </Button>

        {facility && (
          <MantineCard p="md">
            <Stack gap="sm">
              <Text fw={500} size="lg">Hold Details</Text>
              <LESCFacility facility={facility} />
              <Group>
                <Text size="sm" c="dimmed">Hold ID:</Text>
                <Text size="sm" fw={500}>{hold.id}</Text>
              </Group>
            </Stack>
          </MantineCard>
        )}

        <div
          style={{
            width: '230px',
            height: '230px',
            borderRadius: '16px',
            backgroundColor: '#f8f9fa',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Placeholder for photo */}
          <Text size='lg' c='dimmed'>Photo</Text>
        </div>

        <Group justify='space-between' gap='sm'>
          <Button variant='light' onClick={() => navigate('/lesc/intake', { state: { holdId: hold.id } })}>
            Start Intake
          </Button>
          <Button variant='light' color='red' onClick={() => navigate('/lesc/holds')}>
            Cancel
          </Button>
        </Group>

        <Card
          timeRemaining={timeRemaining}
          timeUntil={timeUntil}
          badgeStatus='active'
        />

        <Text
          style={{
            fontSize: '16px',
            lineHeight: '24px',
            fontFamily: 'Roboto, sans-serif',
            fontWeight: 400,
            color: '#212529',
          }}
        >
          Details from form?
        </Text>

        <Button variant='light' onClick={() => navigate('/lesc/intake', { state: { holdId: hold.id } })}>
          View Details
        </Button>
      </Stack>
    </Container>
  );
}

export default CheckIn;
