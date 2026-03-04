import { Accordion, Divider, Stack, Text, Title } from '@mantine/core';

import CustodyCard from './CustodyCard';

function StatusAccordion ({ sections, groupedDeflections, defaultOpen, highlightedId, value, onChange }) {
  const defaultValue = defaultOpen ?? sections
    .filter(s => (groupedDeflections[s.status]?.length ?? 0) > 0)
    .map(s => s.status);

  return (
    <Accordion
      variant='section'
      multiple
      defaultValue={defaultValue}
      value={value}
      onChange={onChange}
    >
      <Divider />
      {sections.map(({ status, label, description }) => {
        const items = groupedDeflections[status] ?? [];
        return (
          <Accordion.Item key={status} value={status}>
            <Accordion.Control>
              <div id={`custody-section-${status}`}>
                <Title order={3}>{label}: {items.length}</Title>
                {description && <Text c='gray.5' size='sm'>{description}</Text>}
              </div>
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap='md'>
                {items.map(d => (
                  <CustodyCard key={d.id} deflection={d} highlighted={String(d.id) === highlightedId} />
                ))}
                {items.length === 0 && (
                  <Text c='dimmed' size='sm'>None</Text>
                )}
              </Stack>
            </Accordion.Panel>
          </Accordion.Item>
        );
      })}
    </Accordion>
  );
}

export default StatusAccordion;
