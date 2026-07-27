import { Stack, Switch } from '@mantine/core';

// Subscribable SMS events (D8) with the Figma copy. `{facility}` is interpolated.
// Shared by the enrollment wizard, the settings page, and the account page so the
// options + copy stay in one place.
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

// Summarize a set/array of subscribed event values into short labels for display.
export function summarizeEvents (events) {
  const set = new Set(events ?? []);
  return NOTIFICATION_EVENTS.filter((e) => set.has(e.value)).map((e) => e.shortLabel).join(', ');
}

// `selected` is a Set of event values; `onToggle(value)` flips one.
function NotificationPreferenceToggles ({ selected, onToggle, facilityName = 'RESET' }) {
  return (
    <Stack gap='lg'>
      {NOTIFICATION_EVENTS.map((event) => (
        <Switch
          key={event.value}
          size='md'
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
