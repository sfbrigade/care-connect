import React from 'react';
import { Badge } from '@mantine/core';

import classes from './DeflectionStatusChip.module.css';

const CHIP_COLOR_BY_TONE = {
  warning: 'yellow',
  neutral: 'gray',
  info: 'blue',
  indigo: 'indigo',
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
      classNames={classes}
      px='md'
      py={6}
    >
      {label}
    </Badge>
  );
}

export default DeflectionStatusChip;
