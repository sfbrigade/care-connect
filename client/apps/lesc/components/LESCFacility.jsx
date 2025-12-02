import { Box, Text, Group, Button } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import StatusBadge from '../../../core/components/StatusBadge';
import Chip from '../../../core/components/Chip';
import { formatTime } from '../../../core/utils/dateTime';

/**
 * LESCFacility component for displaying LESC facility-level information
 * Matches Figma design for facility cards
 */
function LESCFacility ({
  facilityName = 'LESC',
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
    <Box
      style={{
        backgroundColor: '#ffffff',
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
            <StatusBadge status='open' />
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

      <Group justify='flex-end' gap='8px' style={{ width: '100%', display: 'flex', flexWrap: 'nowrap' }}>
        {onCallClick && (
          <Button
            variant='light'
            onClick={onCallClick}
            style={{
              backgroundColor: '#f8f9fa',
              color: '#212529',
              borderRadius: '24px',
              padding: '6px 16px',
              fontSize: '14px',
              lineHeight: '20px',
              fontWeight: 400,
              flex: '0 1 auto',
              whiteSpace: 'nowrap',
            }}
          >
            Call
          </Button>
        )}
        {onHoldClick && (
          <Button
            leftSection={<IconLock size={18} />}
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
              flex: '0 1 auto',
              whiteSpace: 'nowrap',
            }}
          >
            Hold a Bed
          </Button>
        )}
        {actions}
      </Group>

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

      {onCurrentHoldsClick && (
        <Chip
          active={true}
          onClick={onCurrentHoldsClick}
        >
          Current holds
        </Chip>
      )}
    </Box>
  );
}

export default LESCFacility;

