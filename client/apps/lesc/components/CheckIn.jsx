import { useState, useEffect } from 'react';
import { Container, Stack, Text, Group, Button, Card as MantineCard, Loader, Alert, TextInput } from '@mantine/core';
import { useNavigate, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { IconArrowLeft, IconQrcode, IconAlertCircle } from '@tabler/icons-react';
import Card from '../../../core/components/Card';
import { formatTimeUntil } from '../../../core/utils/dateTime';
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
  const [manualHoldId, setManualHoldId] = useState(''); // Separate state for manual entry input
  const [showScanner, setShowScanner] = useState(!holdIdParam); // Auto-show scanner if no holdId
  const [manualEntry, setManualEntry] = useState(false);
  const [shouldFetchHold, setShouldFetchHold] = useState(!!holdIdParam); // Only fetch if we have holdId from URL

  // Auto-show scanner when there's no holdId
  useEffect(() => {
    if (!holdIdParam && !manualEntry) {
      setShowScanner(true);
    }
  }, [holdIdParam, manualEntry]);

  // Fetch hold directly by ID for check-in (allows any authenticated user)
  const { data: holdData, isLoading: isLoadingHold, error: holdError } = useQuery({
    queryKey: ['lesc-hold-for-checkin', holdId],
    queryFn: async () => {
      const response = await Api.lesc.holds.forCheckin(holdId);
      return response.data;
    },
    enabled: !!holdId && shouldFetchHold,
    retry: false,
  });

  const hold = holdData;

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
    if (!manualHoldId) {
      showToast('Please enter Hold ID', 'error');
      return;
    }
    setHoldId(manualHoldId);
    setShouldFetchHold(true);
    navigate(`/lesc/checkin/${manualHoldId}`, { replace: true });
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
                <Button variant="outline" onClick={() => {
                  setShowScanner(false);
                  setManualEntry(true);
                }}>
                  Enter Hold ID
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
                  placeholder="Enter 3-character code (e.g., A21)"
                  value={manualHoldId}
                  onChange={(e) => setManualHoldId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleManualSubmit();
                    }
                  }}
                  maxLength={36} // Allow both 3-char codes and full UUIDs
                  styles={{
                    input: {
                      fontSize: '16px', // Prevent iOS zoom (must be >= 16px)
                    },
                  }}
                />
                <Group>
                  <Button onClick={handleManualSubmit}>
                    Submit
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setManualEntry(false);
                    setManualHoldId('');
                  }}>
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

  if (isLoadingHold) {
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

  // Handle errors with precise messages
  if (holdError || !hold) {
    let errorTitle = 'Hold Not Found';
    let errorMessage = `The hold with ID ${holdId} was not found.`;
    let errorColor = 'red';

    if (holdError?.response) {
      const errorData = holdError.response.data;
      const status = holdError.response.status;

      if (status === 422) {
        // Validation error - invalid format
        errorTitle = 'Invalid Hold ID Format';
        errorMessage = 'Please enter a 3-character code (e.g., A21) or a full hold ID.';
        errorColor = 'orange';
      } else if (status === 404) {
        errorTitle = 'Hold Not Found';
        errorMessage = errorData?.error || `The hold with ID ${holdId} was not found. The hold ID may be incorrect or the hold may have been deleted.`;
      } else if (status === 400) {
        errorTitle = 'Hold Cannot Be Used';
        errorMessage = errorData?.error || 'This hold cannot be used for check-in.';
        errorColor = 'orange';
      } else if (status === 403) {
        errorTitle = 'Access Denied';
        errorMessage = 'You do not have permission to view this hold.';
      } else {
        errorTitle = 'Error Loading Hold';
        errorMessage = errorData?.error || 'An error occurred while loading the hold.';
      }
    }

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
          <Alert icon={<IconAlertCircle size={16} />} color={errorColor} title={errorTitle}>
            <Text size="sm">{errorMessage}</Text>
          </Alert>
          <Button onClick={() => {
            setHoldId('');
            setManualHoldId('');
            setManualEntry(false);
            setShowScanner(false);
            setShouldFetchHold(false);
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
