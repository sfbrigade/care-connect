import EmptyState from './EmptyState';

export default {
  title: 'LESC/Custody/EmptyState',
  component: EmptyState,
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

export const NoneInCustody = {
  args: {
    title: 'No persons In Custody',
    description: "When you receive a person from an arresting officer, they'll appear here.",
  },
};

export const NoneReleased = {
  args: {
    title: 'No persons in Released',
    description: "Released persons appear here, but those who exit the facility will disappear from view after 72 hours. They're retained in legal records.",
    updatedAt: Date.now(),
  },
};
