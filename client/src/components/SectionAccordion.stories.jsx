import { Accordion, Stack, Text, Title } from '@mantine/core';

export default {
  title: 'Components/SectionAccordion',
  parameters: {
    layout: 'centered',
  },
};

export const Default = {
  render: () => (
    <div style={{ width: 420 }}>
      <Accordion variant='section' multiple defaultValue={['narcotics', 'drug-use']}>
        <Accordion.Item value='narcotics'>
          <Accordion.Control>
            <Title order={3}>Narcotics</Title>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap='sm'>
              <Text c='dimmed'>Controlled substance</Text>
              <Text c='teal.6'>No</Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='drug-use'>
          <Accordion.Control>
            <Title order={3}>Drug use</Title>
            <Text c='gray.5' size='sm'>Optional</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap='sm'>
              <Text c='dimmed'>Evidence of drug use</Text>
              <Text c='red.6'>Yes</Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  ),
};
