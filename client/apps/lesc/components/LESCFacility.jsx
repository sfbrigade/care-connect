import { Box, Text, Group, Button, Stack } from '@mantine/core';
import { IconBed } from '@tabler/icons-react';
import { formatTime } from '../../../core/utils/dateTime';

/**
 * LESCFacility component for displaying LESC facility-level information
 * Matches Figma design: https://www.figma.com/design/Q8kS4FJXh1TbbM8eDR7Z6Y/CareConnect?node-id=902-14464&m=dev
 */
function LESCFacility ({
  facilityName = 'Law Enforcement Sobering Center',
  address = '123 Main St, San Francisco',
  bedCount = 10,
  intakeHours = '24/7',
  lastUpdated,
  onCurrentHoldsClick,
  onCallClick,
  onHoldClick,
  actions,
  ...props
}) {
  const formatLastUpdated = () => {
    if (lastUpdated) {
      return lastUpdated;
    }
    return formatTime(new Date());
  };

  return (
    <Stack gap='8px' style={{ width: '100%', ...props.style }} {...props}>
      {/* Main card */}
      <Box
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: '100%',
        }}
      >
        {/* Header: Facility name and address */}
        <Stack gap={0}>
          <Text
            style={{
              fontSize: '16px',
              lineHeight: '24px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 600,
              color: '#212529',
              marginBottom: 0,
            }}
          >
            {facilityName}
          </Text>
          <Text
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#868e96',
              marginTop: 0,
            }}
          >
            {address}
          </Text>
        </Stack>

        {/* Bed count and button section */}
        <Group justify='space-between' align='center' style={{ width: '100%' }}>
          {/* Bed count with icon */}
          <Group gap='8px' align='center' style={{ flex: '1 0 auto' }}>
            <Text
              style={{
                fontSize: '40px',
                lineHeight: '48px',
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 700,
                color: '#000000',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
            >
              {bedCount}
            </Text>
            <IconBed size={36} color='#868e96' stroke={1.5} />
          </Group>

          {/* Hold a Bed button */}
          {onHoldClick && (
            <Button
              onClick={onHoldClick}
              disabled={bedCount === 0}
              style={{
                backgroundColor: bedCount === 0 ? '#f8f9fa' : '#000000',
                color: bedCount === 0 ? '#868e96' : '#ffffff',
                borderRadius: '24px',
                padding: '6px 16px',
                fontSize: '14px',
                lineHeight: '20px',
                fontWeight: 400,
                height: 'auto',
                flexShrink: 0,
              }}
            >
              Hold a Bed
            </Button>
          )}
          {actions}
        </Group>
      </Box>

      {/* Footer: Last updated */}
      {lastUpdated !== false && (
        <Group justify='flex-end' style={{ width: '100%', padding: '0 12px' }}>
          <Text
            style={{
              fontSize: '12px',
              lineHeight: '16px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#adb5bd',
              textAlign: 'right',
            }}
          >
            Last updated: {formatLastUpdated()}
          </Text>
        </Group>
      )}
    </Stack>
  );
}

export default LESCFacility;

