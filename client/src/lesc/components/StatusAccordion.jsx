import { Accordion, Stack, Text, Title } from '@mantine/core';

function StatusAccordion ({ sections, groupedDeflections, defaultOpen, renderCard }) {
  const defaultValue = defaultOpen ?? sections
    .filter(s => (groupedDeflections[s.status]?.length ?? 0) > 0)
    .map(s => s.status);

  return (
    <Accordion variant='section' multiple defaultValue={defaultValue}>
      {sections.map(({ status, label, description }) => {
        const items = groupedDeflections[status] ?? [];
        return (
          <Accordion.Item key={status} value={status}>
            <Accordion.Control disabled={items.length === 0}>
              <Title order={3}>{label}: {items.length}</Title>
              {description && <Text c='gray.5' size='sm'>{description}</Text>}
            </Accordion.Control>
            <Accordion.Panel>
              <Stack gap='md'>
                {items.map(d => renderCard(d))}
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
