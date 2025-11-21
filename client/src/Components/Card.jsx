import { Box, Text, Group } from '@mantine/core';
import StatusBadge from './StatusBadge';

/**
 * Card component matching Figma _Card design
 * Used for hold cards and other card-based layouts
 */
function Card ({ 
  title,
  subtitle,
  badge,
  badgeStatus,
  timeRemaining,
  timeUntil,
  details,
  actions,
  children,
  ...props 
}) {
  return (
    <Box
      style={{
        backgroundColor: '#f8f9fa',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        ...props.style,
      }}
      {...props}
    >
      {(title || badge || badgeStatus) && (
        <Group justify="space-between" align="flex-start">
          <Box style={{ flex: 1 }}>
            {title && (
              <Text
                style={{
                  fontSize: '20px',
                  lineHeight: '32px',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 600,
                  color: '#212529',
                  marginBottom: timeRemaining ? '0' : '4px',
                }}
              >
                {title}
              </Text>
            )}
            {timeRemaining && (
              <Text
                style={{
                  fontSize: '20px',
                  lineHeight: '32px',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 600,
                  color: '#212529',
                }}
              >
                {timeRemaining}
              </Text>
            )}
            {timeUntil && (
              <Text
                style={{
                  fontSize: '14px',
                  lineHeight: '20px',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 400,
                  color: '#868e96',
                }}
              >
                {timeUntil}
              </Text>
            )}
            {subtitle && (
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
                {subtitle}
              </Text>
            )}
          </Box>
          {(badge || badgeStatus) && (
            <Box>
              {badgeStatus ? (
                <StatusBadge status={badgeStatus} />
              ) : (
                badge
              )}
            </Box>
          )}
        </Group>
      )}
      
      {details && (
        <Text
          style={{
            fontSize: '14px',
            lineHeight: '20px',
            fontFamily: 'Roboto, sans-serif',
            fontWeight: 400,
            color: '#868e96',
          }}
        >
          {details}
        </Text>
      )}
      
      {children}
      
      {actions && (
        <Group justify="flex-end" gap="8px" mt="8px">
          {actions}
        </Group>
      )}
    </Box>
  );
}

export default Card;

