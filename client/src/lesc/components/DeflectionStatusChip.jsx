import { Badge } from '@mantine/core';

const CHIP_COLOR_BY_TONE = {
  warning: 'orange',
  neutral: 'gray',
  info: 'blue',
  success: 'teal',
  danger: 'red',
};

function DeflectionStatusChip ({ label, tone = 'neutral' }) {
  if (!label) return null;

  return (
    <Badge
      variant='light'
      color={CHIP_COLOR_BY_TONE[tone] || CHIP_COLOR_BY_TONE.neutral}
      radius='xl'
      size='lg'
      styles={{
        label: {
          textTransform: 'none',
          fontWeight: 500,
          fontSize: '14px',
          lineHeight: '20px',
          paddingInline: '2px',
        },
      }}
      px='md'
      py={6}
    >
      {label}
    </Badge>
  );
}

export default DeflectionStatusChip;
