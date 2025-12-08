import { Box, Text, Group, Anchor } from '@mantine/core';
import StatusBadge from '../../../core/components/StatusBadge';

/**
 * LESCHold component for displaying individual bed hold cards
 * Matches Figma design with patient information and status badge
 */
function LESCHold ({
  hold,
  // Patient information (optional)
  patientId,
  patientName,
  patientDob,
  patientAge,
  patientSex,
  patientRace,
  // Status
  status = 'active', // 'active', 'in-transit', 'expired', 'warning'
  // Actions
  onCancel,
  onViewDetails,
  onTransfer,
  onExtend,
  actions,
  ...props
}) {
  // Extract hold ID for display (first 3 characters or full ID)
  const displayId = hold?.id ? hold.id.slice(0, 3).toUpperCase() : patientId || '001';
  
  // Use patient name if provided, otherwise use hold notes or fallback
  const displayName = patientName || hold?.notes || 'Hold';
  
  // Format DOB if provided
  const formatDob = (dob, age) => {
    if (!dob) return null;
    const dobDate = new Date(dob);
    const dobStr = `${String(dobDate.getMonth() + 1).padStart(2, '0')}/${String(dobDate.getDate()).padStart(2, '0')}/${dobDate.getFullYear()}`;
    if (age) {
      return `DOB: ${dobStr} (${age} yrs old)`;
    }
    return `DOB: ${dobStr}`;
  };

  // Format start time (e.g., "Started: 2:30 PM")
  const formatStartTime = (createdAt) => {
    if (!createdAt) return null;
    const startDate = new Date(createdAt);
    const hours = startDate.getHours();
    const minutes = startDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes.toString().padStart(2, '0');
    return `Started: ${displayHours}:${displayMinutes} ${ampm}`;
  };

  // Format time remaining (e.g., "59 mins" or "1h 30m")
  const formatTimeRemaining = (expiresAt) => {
    if (!expiresAt) return null;
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - Date.now();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 0) return 'Expired';
    if (diffMins < 60) return `${diffMins} mins remaining`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m remaining`;
  };

  // Determine status badge
  let badgeStatus = status;
  if (hold?.status === 'TRANSFERRED') {
    badgeStatus = 'in-transit';
  } else if (hold?.status === 'EXPIRED' || hold?.status === 'CANCELLED') {
    badgeStatus = hold.status.toLowerCase();
  } else if (hold?.expiresAt) {
    const expiresAt = new Date(hold.expiresAt);
    const isExpiringSoon = expiresAt.getTime() - Date.now() < 15 * 60 * 1000;
    if (isExpiringSoon) {
      badgeStatus = 'warning';
    }
  }

  return (
    <Box
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        ...props.style,
      }}
      {...props}
    >
      <Box
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          width: '100%',
        }}
      >
        {/* Header: ID + Name with Status Badge */}
        <Group justify='space-between' align='center' style={{ marginBottom: '4px' }}>
          <Text
            style={{
              fontSize: '24px',
              lineHeight: '32px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 500,
              color: '#212529',
              flex: 1,
            }}
          >
            {displayId} {displayName}
          </Text>
          <StatusBadge status={badgeStatus} />
        </Group>

        {/* Patient Details Section */}
        <Box
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0px',
            marginTop: '4px',
          }}
        >
          <Text
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#868e96',
            }}
          >
            {patientDob ? formatDob(patientDob, patientAge) : 'DOB:'}
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
            Sex: {patientSex || 'Sex'}
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
            Race: {patientRace || 'Race'}
          </Text>
        </Box>

        {/* Fallback: Show hold notes if no patient info */}
        {!patientDob && !patientSex && !patientRace && hold?.notes && (
          <Text
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#868e96',
              marginTop: '4px',
            }}
          >
            {hold.notes}
          </Text>
        )}

        {/* Time Information */}
        {(hold?.createdAt || hold?.expiresAt) && (
          <Box
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0px',
              marginTop: '4px',
            }}
          >
            {hold?.createdAt && formatStartTime(hold.createdAt) && (
              <Text
                style={{
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 400,
                  color: '#868e96',
                }}
              >
                {formatStartTime(hold.createdAt)}
              </Text>
            )}
            {hold?.expiresAt && formatTimeRemaining(hold.expiresAt) && (
              <Text
                style={{
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 400,
                  color: '#868e96',
                }}
              >
                {formatTimeRemaining(hold.expiresAt)}
              </Text>
            )}
          </Box>
        )}
      </Box>

      {/* Actions */}
      {(actions || onCancel || onViewDetails || onTransfer || onExtend) && (
        <Group justify='flex-end' gap='8px' style={{ marginTop: '4px', flexWrap: 'nowrap' }}>
          {actions || (
            <>
              {onTransfer && (
                <Text
                  component='button'
                  onClick={onTransfer}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '32px',
                    fontSize: '14px',
                    lineHeight: '20px',
                    fontFamily: 'Roboto, sans-serif',
                    fontWeight: 400,
                    color: '#228be6',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  Transfer
                </Text>
              )}
              {onExtend && (
                <Text
                  component='button'
                  onClick={onExtend}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '32px',
                    fontSize: '14px',
                    lineHeight: '20px',
                    fontFamily: 'Roboto, sans-serif',
                    fontWeight: 400,
                    color: '#228be6',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  Extend
                </Text>
              )}
              {onViewDetails && (
                <Anchor
                  component='button'
                  type='button'
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onViewDetails();
                  }}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '32px',
                    fontSize: '14px',
                    lineHeight: '20px',
                    fontFamily: 'Roboto, sans-serif',
                    fontWeight: 400,
                    color: '#228be6',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  View details
                </Anchor>
              )}
              {onCancel && (
                <Text
                  component='button'
                  onClick={onCancel}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '32px',
                    fontSize: '14px',
                    lineHeight: '20px',
                    fontFamily: 'Roboto, sans-serif',
                    fontWeight: 400,
                    color: '#fa5252',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: 'none',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.textDecoration = 'none';
                  }}
                >
                  Cancel hold
                </Text>
              )}
            </>
          )}
        </Group>
      )}
    </Box>
  );
}

export default LESCHold;
