import { useState, useEffect } from 'react';
import { Container, Stack, Text, Group, Button, Card as MantineCard, Loader, Alert, TextInput } from '@mantine/core';
import { useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { IconArrowLeft, IconQrcode, IconAlertCircle, IconFileDownload } from '@tabler/icons-react';
import { jsPDF } from 'jspdf';
import Api from '@/Api';
import QRScanner from '@/components/QRScanner';
import { useToast } from '@/components/ToastContext';
import { calculateAge } from '@/utils/dateTime';
import LESCFacility from './LESCFacility';

/**
 * Check-in screen - matches Figma "Check-in" design
 * Allows scanning QR code or entering hold ID manually
 */
function CheckIn () {
  const navigate = useNavigate();
  const { holdId: holdIdParam } = useParams();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

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

  // Ensure query runs when holdIdParam changes (e.g., from URL navigation)
  useEffect(() => {
    if (holdIdParam) {
      setHoldId(holdIdParam);
      setShouldFetchHold(true);
    }
  }, [holdIdParam]);

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
        setShouldFetchHold(true); // Enable the query
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

  // Mutation to create check-in
  const checkInMutation = useMutation({
    mutationFn: (holdId) => Api.lesc.checkin.create(holdId, {}),
    onSuccess: () => {
      // Show success toast
      const clientName = hold?.client
        ? `${hold.client.firstName} ${hold.client.lastName || ''}`.trim()
        : null;
      const displayName = clientName || hold?.id?.substring(0, 8).toUpperCase() || 'client';
      showToast(`Successfully checked in ${displayName}`, 'success');
      // Invalidate holds and availability to refresh data
      queryClient.invalidateQueries({ queryKey: ['lesc-holds'] });
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
      // Navigate back to holds list
      navigate('/lesc/holds');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || 'Failed to check in. Please try again.';
      showToast(errorMessage, 'error');
    },
  });

  const handleCheckIn = () => {
    if (hold?.id) {
      checkInMutation.mutate(hold.id);
    }
  };

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
            <Stack gap='md'>
              <Text>Scan a QR code or enter hold ID manually to check in.</Text>
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
                  Enter Hold ID
                </Button>
              </Group>
            </Stack>
          )}

          {showScanner && (
            <MantineCard p='md'>
              <Stack gap='md'>
                <Text fw={500}>Scan QR Code</Text>
                <QRScanner
                  autoStart
                  onScanSuccess={handleQRScan}
                  onScanError={(err) => {
                    if (!err.includes('No QR code found')) {
                      showToast(err, 'error');
                    }
                  }}
                />
                <Button
                  variant='outline' onClick={() => {
                    setShowScanner(false);
                    setManualEntry(true);
                  }}
                >
                  Enter Hold ID
                </Button>
              </Stack>
            </MantineCard>
          )}

          {manualEntry && (
            <MantineCard p='md'>
              <Stack gap='md'>
                <Text fw={500}>Enter Hold ID</Text>
                <TextInput
                  label='Hold ID'
                  placeholder='Enter 3-character code (e.g., A21)'
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
                  <Button
                    variant='outline' onClick={() => {
                      setManualEntry(false);
                      setManualHoldId('');
                    }}
                  >
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
          <Group justify='center' p='xl'>
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
        const fullHoldId = errorData?.holdId || holdId;
        errorMessage = errorData?.error || `The hold with ID ${fullHoldId.substring(0, 8).toUpperCase()}... (${fullHoldId}) was not found. The hold ID may be incorrect or the hold may have been deleted.`;
        // Provide helpful guidance
        if (holdId.length === 3) {
          errorMessage += ' Make sure you\'re using the correct 3-character code from the holds list.';
        } else {
          errorMessage += ' Please verify the hold ID and try again.';
        }
      } else if (status === 400) {
        errorTitle = 'Hold Cannot Be Used for Check-In';
        const fullHoldId = errorData?.holdId || holdId;
        errorMessage = errorData?.error || `Hold ${fullHoldId.substring(0, 8).toUpperCase()}... (${fullHoldId}) cannot be used for check-in.`;
        errorColor = 'orange';
        // If the error mentions expired/cancelled/transferred, suggest requesting a new hold
        if (errorData?.error && (
          errorData.error.toLowerCase().includes('expired') ||
          errorData.error.toLowerCase().includes('cancelled') ||
          errorData.error.toLowerCase().includes('transferred')
        )) {
          errorMessage += ' You may need to request a new hold.';
        }
      } else if (status === 403) {
        errorTitle = 'Access Denied';
        errorMessage = 'You do not have permission to view this hold.';
      } else {
        errorTitle = 'Error Loading Hold';
        errorMessage = errorData?.error || 'An error occurred while loading the hold. Please try again.';
      }
    } else if (!hold && !holdError) {
      // No error response but no hold data
      errorTitle = 'Hold Not Found';
      errorMessage = `The hold with ID ${holdId.substring(0, 8).toUpperCase()}... (${holdId}) was not found. Please verify the hold ID and try again.`;
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
            <Text size='sm'>{errorMessage}</Text>
          </Alert>
          <Button onClick={() => {
            setHoldId('');
            setManualHoldId('');
            setManualEntry(false);
            setShowScanner(false);
            setShouldFetchHold(false);
          }}
          >
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

  // Calculate age from dateOfBirth if available
  const age = calculateAge(hold.client?.dateOfBirth);

  // Format DOB
  const formatDob = (dob) => {
    if (!dob) return null;
    const dobDate = new Date(dob);
    const month = String(dobDate.getMonth() + 1).padStart(2, '0');
    const day = String(dobDate.getDate()).padStart(2, '0');
    const year = dobDate.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // Format time
  const formatTime = (date) => {
    const d = new Date(date);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayH = hours % 12 || 12;
    const displayM = minutes.toString().padStart(2, '0');
    return `${displayH}:${displayM} ${ampm}`;
  };

  // Generate PDF with client information
  const generatePDF = () => {
    if (!hold || !hold.client) {
      showToast('No client information available', 'error');
      return;
    }

    try {
      const doc = new jsPDF();
      let yPos = 20;

      // Title
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('Client Information', 20, yPos);
      yPos += 15;

      // Subject Information Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Subject Information', 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      // Name
      const clientName = hold.client
        ? `${hold.client.firstName} ${hold.client.lastName || ''}`.trim()
        : 'No name provided';
      doc.text(`Name: ${clientName}`, 20, yPos);
      yPos += 7;

      // Date of Birth
      if (hold.client?.dateOfBirth) {
        const dobFormatted = formatDob(hold.client.dateOfBirth);
        const ageText = age !== null ? ` (${age} yrs old)` : '';
        doc.text(`Date of Birth: ${dobFormatted}${ageText}`, 20, yPos);
        yPos += 7;
      }

      // Sex
      if (hold.client?.sex) {
        doc.text(`Sex: ${hold.client.sex}`, 20, yPos);
        yPos += 7;
      }

      // Race
      if (hold.client?.race) {
        doc.text(`Race: ${hold.client.race}`, 20, yPos);
        yPos += 7;
      }

      yPos += 5;

      // Hold Summary Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Hold Summary', 20, yPos);
      yPos += 10;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      // Hold ID
      doc.text(`Hold ID: ${hold.id.substring(0, 8).toUpperCase()}...`, 20, yPos);
      yPos += 7;

      // Holder
      if (hold.createdBy) {
        doc.text(`Holder: ${hold.createdBy.firstName} ${hold.createdBy.lastName}`, 20, yPos);
        yPos += 7;
      }

      // Service Type
      if (hold.serviceTypeName) {
        doc.text(`Service Type: ${hold.serviceTypeName}`, 20, yPos);
        yPos += 7;
      }

      // Beds
      doc.text(`Beds Requested: ${hold.bedsRequested}`, 20, yPos);
      yPos += 7;

      // Expires
      const expiresFormatted = formatTime(hold.expiresAt);
      doc.text(`Expires: ${expiresFormatted} (${timeRemaining})`, 20, yPos);
      yPos += 7;

      // Notes
      if (hold.notes) {
        doc.text(`Notes: ${hold.notes}`, 20, yPos);
        yPos += 7;
      }

      yPos += 5;

      // Facility Information Section
      if (facility) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Facility Information', 20, yPos);
        yPos += 10;

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');

        if (facility.name) {
          doc.text(`Facility: ${facility.name}`, 20, yPos);
          yPos += 7;
        }

        if (facility.addressLine1) {
          let address = facility.addressLine1;
          if (facility.addressLine2) {
            address += `, ${facility.addressLine2}`;
          }
          if (facility.city) {
            address += `, ${facility.city}`;
          }
          if (facility.state) {
            address += `, ${facility.state}`;
          }
          if (facility.postalCode) {
            address += ` ${facility.postalCode}`;
          }
          doc.text(`Address: ${address}`, 20, yPos);
          yPos += 7;
        }

        if (facility.phone) {
          doc.text(`Phone: ${facility.phone}`, 20, yPos);
          yPos += 7;
        }
      }

      // Footer
      const pageHeight = doc.internal.pageSize.height;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text(`Generated: ${new Date().toLocaleString()}`, 20, pageHeight - 10);

      // Save the PDF
      const fileName = `client-info-${hold.id.substring(0, 8)}.pdf`;
      doc.save(fileName);
      showToast('PDF generated successfully', 'success');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('Failed to generate PDF', 'error');
    }
  };

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

        {/* Subject Information Card */}
        <MantineCard p="md">
          <Stack gap="md">
            <Group justify="space-between" align="center">
              <Text fw={500} size="lg">Subject Information</Text>
              <Button
                leftSection={<IconFileDownload size={16} />}
                variant="outline"
                size="sm"
                onClick={generatePDF}
              >
                Generate PDF
              </Button>
            </Group>
            
            <Group align="flex-start" gap="md">
              {/* Photo placeholder */}
              <div
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '8px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Text size='sm' c='dimmed' ta='center' p='xs'>Photo</Text>
              </div>

              {/* Subject details */}
              <Stack gap='xs' style={{ flex: 1 }}>
                <div>
                  <Text size='xs' c='dimmed' fw={500} mb={4}>Name</Text>
                  <Text size='md' fw={500}>
                    {hold.client
                      ? `${hold.client.firstName} ${hold.client.lastName || ''}`.trim()
                      : 'No name provided'}
                  </Text>
                </div>

                {hold.client?.dateOfBirth && (
                  <div>
                    <Text size='xs' c='dimmed' fw={500} mb={4}>Date of Birth</Text>
                    <Text size='md'>
                      {formatDob(hold.client.dateOfBirth)}
                      {age !== null && ` (${age} yrs old)`}
                    </Text>
                  </div>
                )}

                {hold.client?.sex && (
                  <div>
                    <Text size='xs' c='dimmed' fw={500} mb={4}>Sex</Text>
                    <Text size='md'>{hold.client.sex}</Text>
                  </div>
                )}
              </Stack>
            </Group>
          </Stack>
        </MantineCard>

        {facility && (
          <MantineCard p='md'>
            <Stack gap='sm'>
              <Text fw={500} size='lg'>Facility</Text>
              <LESCFacility facility={facility} />
            </Stack>
          </MantineCard>
        )}

        {/* Hold Summary Card */}
        <MantineCard p='md'>
          <Stack gap='md'>
            <Text fw={500} size='lg'>Hold Summary</Text>

            <Stack gap='xs'>
              <Group>
                <Text size='sm' c='dimmed' style={{ minWidth: '100px' }}>Hold ID:</Text>
                <Text size='sm' fw={500}>{hold.id.substring(0, 8).toUpperCase()}...</Text>
              </Group>

              {hold.createdBy && (
                <Group>
                  <Text size='sm' c='dimmed' style={{ minWidth: '100px' }}>Holder:</Text>
                  <Text size='sm'>{hold.createdBy.firstName} {hold.createdBy.lastName}</Text>
                </Group>
              )}

              <Group>
                <Text size='sm' c='dimmed' style={{ minWidth: '100px' }}>Service Type:</Text>
                <Text size='sm'>{hold.serviceTypeName}</Text>
              </Group>

              <Group>
                <Text size='sm' c='dimmed' style={{ minWidth: '100px' }}>Beds:</Text>
                <Text size='sm'>{hold.bedsRequested}</Text>
              </Group>

              <Group>
                <Text size='sm' c='dimmed' style={{ minWidth: '100px' }}>Expires:</Text>
                <Text size='sm'>{formatTime(hold.expiresAt)} ({timeRemaining})</Text>
              </Group>

              {hold.notes && (
                <Group>
                  <Text size='sm' c='dimmed' style={{ minWidth: '100px' }}>Notes:</Text>
                  <Text size='sm'>{hold.notes}</Text>
                </Group>
              )}
            </Stack>
          </Stack>
        </MantineCard>

        <Button
          onClick={handleCheckIn}
          loading={checkInMutation.isPending}
          disabled={checkInMutation.isPending}
          size='xl'
          fullWidth
          style={{ marginTop: '20px' }}
        >
          Check In
        </Button>
      </Stack>
    </Container>
  );
}

export default CheckIn;
