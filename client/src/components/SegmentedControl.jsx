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
          variant={manualEntry ? 'subtle' : 'white'}
          color='dark'
          size='xl'
          radius='xl'
          p='sm'
          onClick={onClose}
          aria-label='Close'
        >
          <IconX size={24} />
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
            root: classes.segmentedRoot,
            control: classes.segmentedControl,
            label: classes.segmentedLabel,
            indicator: classes.segmentedIndicator,
          }}
        />
      </Box>
    </>
  );
}
