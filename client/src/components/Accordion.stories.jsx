import { Accordion, Text } from '@mantine/core';

export default {
  title: 'Components/Accordion',
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ padding: '20px', maxWidth: '480px', margin: '0 auto' }}>
        <Story />
      </div>
    ),
  ],
};

const items = [
  { value: 'one', label: 'Section One', content: 'Content for section one.' },
  { value: 'two', label: 'Section Two', content: 'Content for section two.' },
  { value: 'three', label: 'Section Three', content: 'Content for section three.' },
];

export const Default = {
  render: () => (
    <Accordion variant='default' multiple defaultValue={['one']}>
      {items.map((item) => (
        <Accordion.Item key={item.value} value={item.value}>
          <Accordion.Control>{item.label}</Accordion.Control>
          <Accordion.Panel><Text size='sm'>{item.content}</Text></Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  ),
};

export const Section = {
  render: () => (
    <Accordion variant='section' multiple defaultValue={['one']}>
      {items.map((item) => (
        <Accordion.Item key={item.value} value={item.value}>
          <Accordion.Control>{item.label}</Accordion.Control>
          <Accordion.Panel><Text size='sm'>{item.content}</Text></Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  ),
};

export const Contained = {
  render: () => (
    <Accordion variant='contained' multiple defaultValue={['one']} chevronPosition='left'>
      {items.map((item) => (
        <Accordion.Item key={item.value} value={item.value}>
          <Accordion.Control>{item.label}</Accordion.Control>
          <Accordion.Panel><Text size='sm'>{item.content}</Text></Accordion.Panel>
        </Accordion.Item>
      ))}
    </Accordion>
  ),
};
