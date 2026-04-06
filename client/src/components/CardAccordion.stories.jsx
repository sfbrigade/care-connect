import { Accordion, Card, Stack, Text } from '@mantine/core';
import SectionLabel from './SectionLabel';

export default {
  title: 'Components/CardAccordion',
  parameters: {
    layout: 'centered',
  },
};

export const Default = {
  render: () => (
    <div style={{ width: 420 }}>
      <Accordion variant='card' chevronPosition='left' multiple defaultValue={['invited', 'active', 'disabled']}>
        <Accordion.Item value='invited'>
          <Accordion.Control>
            <SectionLabel label='Invited: 2' info='Users who have been sent an invite but have not yet accepted.' />
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap='sm'>
              <Card bg='white' p='md'>
                <Text fw={500}>jane.doe@example.com</Text>
                <Text size='sm' c='dimmed'>Pending invite</Text>
              </Card>
              <Card bg='white' p='md'>
                <Text fw={500}>john.smith@example.com</Text>
                <Text size='sm' c='dimmed'>Pending invite</Text>
              </Card>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='active'>
          <Accordion.Control>
            <SectionLabel label='Active: 3' info='Users with active accounts who can sign in.' />
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap='sm'>
              <Card bg='white' p='md'>
                <Text fw={500}>Alice Johnson</Text>
                <Text size='sm' c='dimmed'>Org Admin</Text>
              </Card>
              <Card bg='white' p='md'>
                <Text fw={500}>Bob Williams</Text>
                <Text size='sm' c='dimmed'>Facility Admin</Text>
              </Card>
              <Card bg='white' p='md'>
                <Text fw={500}>Carol Davis</Text>
                <Text size='sm' c='dimmed'>Field</Text>
              </Card>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value='disabled'>
          <Accordion.Control>
            <SectionLabel label='Disabled: 0' info='Accounts that have been disabled. They can be re-enabled.' />
          </Accordion.Control>
          <Accordion.Panel />
        </Accordion.Item>
      </Accordion>
    </div>
  ),
};
