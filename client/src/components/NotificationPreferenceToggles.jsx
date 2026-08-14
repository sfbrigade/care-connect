import { Stack, Switch } from '@mantine/core';

export const NOTIFICATION_EVENTS = [
  {
    value: 'NEW_HOLD',
    label: 'Person in transit to {facility}',
    shortLabel: 'Person in transit',
    description: 'Get notified when the person has completed the arrest process and is on their way to {facility}.',
  },
  {
    value: 'ARRIVAL',
    label: 'Person has arrived at {facility}',
    shortLabel: 'Person has arrived',
    description: 'Get notified when the person has physically arrived at {facility} and is awaiting custody transfer.',
  },
  {
    value: 'EXIT',
    label: 'Person has exited {facility}',
    shortLabel: 'Person has exited',
    description: 'Get notified when the person has physically left the {facility} building.',
  },
];

export function summarizeEvents (events) {
  const set = new Set(events ?? []);
  return NOTIFICATION_EVENTS.filter((e) => set.has(e.value)).map((e) => e.shortLabel).join(', ');
}

// "Enrolled / subscribed" = phone verified AND subscribed to ≥1 event (i.e. set up
// to actually receive SMS).
export function isSmsSubscribed (user) {
  return !!user?.phoneVerifiedAt && (user?.subscribedEvents?.length ?? 0) > 0;
}

function NotificationPreferenceToggles ({ selected, onToggle, facilityName = 'RESET' }) {
  return (
    <Stack gap='lg'>
      {NOTIFICATION_EVENTS.map((event) => (
        <Switch
          key={event.value}
          size='md'
          withThumbIndicator={false}
          labelPosition='left'
          styles={{
            root: { width: '100%' },
            body: { alignItems: 'center' },
            labelWrapper: { flex: 1 },
          }}
          checked={selected.has(event.value)}
          onChange={() => onToggle(event.value)}
          label={event.label.replaceAll('{facility}', facilityName)}
          description={event.description.replaceAll('{facility}', facilityName)}
        />
      ))}
    </Stack>
  );
}

export default NotificationPreferenceToggles;
