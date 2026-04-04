import { ActionIcon, Box, Group, SegmentedControl as MantineSegmentedControl } from '@mantine/core';
import { IconX } from '@tabler/icons-react';

import classes from './ScanCodeModal.module.css';

const SCAN_OR_TYPE_DATA = [
  { value: 'scan', label: 'Scan QR code' },
  { value: 'type', label: 'Type code' },
];

export default function SegmentedControl ({ manualEntry, onClose, onManualEntryChange }) {
  return (
    <>
      <Group justify='flex-end' w='100%' pt='xl' px='xl'>
        <ActionIcon
          variant='filled'
          color={manualEntry ? '#868E961A' : '#3B3B3B'}
          size='xl'
          radius='xl'
          p='sm'
          onClick={onClose}
          aria-label='Close'
        >
          <IconX color={manualEntry ? '#3B3B3B' : 'white'} size={24} />
        </ActionIcon>
      </Group>
      <Box className={classes.segmentWrap}>
        <MantineSegmentedControl
          fullWidth
          size='sm'
          value={manualEntry ? 'type' : 'scan'}
          onChange={(value) => onManualEntryChange(value === 'type')}
          data={SCAN_OR_TYPE_DATA}
          classNames={{
            root: [classes.segmentedRoot, manualEntry && classes.segmentedRootTypeMode].filter(Boolean).join(' '),
            control: classes.segmentedControl,
            label: classes.segmentedLabel,
            indicator: classes.segmentedIndicator,
          }}
        />
      </Box>
    </>
  );
}
