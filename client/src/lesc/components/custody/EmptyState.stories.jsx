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
    title: 'No persons in custody',
    description: "When you receive a person from SFPD, they'll appear here.",
  },
};

export const NoneReleased = {
  args: {
    title: 'No persons in released',
    description: "Released persons appear here, but those who exit the facility will disappear from view after 24 hours. They're retained in legal records.",
  },
};
