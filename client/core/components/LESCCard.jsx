import { Box, Text, Group } from '@mantine/core';
import StatusBadge from './StatusBadge';

/**
 * LESCCard component for displaying LESC facility information
 * Matches Figma _LESCCard design
 */
function LESCCard ({
  facilityName = 'LESC',
  address = '123 Main St, San Francisco',
  bedCount = 10,
  status = 'open', // 'open' or 'closed'
  intakeHours = '24/7',
  lastUpdated,
  actions,
  ...props
}) {
  const formatLastUpdated = () => {
    if (lastUpdated) {
      return lastUpdated;
    }
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `${displayHours}:${displayMinutes} ${ampm}`;
  };

  return (
    <Box
      style={{
        backgroundColor: '#f8f9fa',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        ...props.style,
      }}
      {...props}
    >
      <Group justify='space-between' align='flex-start'>
        <Box style={{ flex: 1 }}>
          <Group justify='space-between' mb='8px'>
            <Text
              style={{
                fontSize: '24px',
                lineHeight: '32px',
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 700,
                color: '#000000',
              }}
            >
              {bedCount} beds
            </Text>
            <StatusBadge status={status === 'open' ? 'open' : 'expired'} />
          </Group>

          <Text
            style={{
              fontSize: '16px',
              lineHeight: '24px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 600,
              color: '#212529',
              marginBottom: '4px',
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
            }}
          >
            {address}
          </Text>

          <Text
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#868e96',
            }}
          >
            Intake Hours: {intakeHours}
          </Text>
        </Box>
      </Group>

      {actions && (
        <Group justify='flex-end' gap='8px'>
          {actions}
        </Group>
      )}

      {lastUpdated !== false && (
        <Text
          style={{
            fontSize: '14px',
            lineHeight: '20px',
            fontFamily: 'Roboto, sans-serif',
            fontWeight: 400,
            color: '#adb5bd',
          }}
        >
          Last updated: {formatLastUpdated()}
        </Text>
      )}
    </Box>
  );
}

export default LESCCard;
