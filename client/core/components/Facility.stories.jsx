import { fn } from 'storybook/test';
import { Stack, Title } from '@mantine/core';
import Facility from './Facility';

export default {
  title: 'Components/Facility',
  component: Facility,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

const mockFacilities = [
  {
    id: '1',
    name: 'Test Facility',
    slug: 'test-facility',
    distanceMiles: 1.2,
    primaryCategory: 'medical',
    districtLabel: 'Downtown',
    displayAddress: '123 Test St, San Francisco, CA',
    primaryService: 'Medical Help',
  },
  {
    id: '2',
    name: 'Another Facility',
    slug: 'another-facility',
    distanceMiles: 2.5,
    primaryCategory: 'shelter',
    districtLabel: 'Mission',
    displayAddress: '456 Mission St, San Francisco, CA',
    primaryService: 'Emergency Shelter',
  },
];

export const Default = {
  render: () => (
    <div style={{ padding: '20px', maxWidth: '375px', margin: '0 auto' }}>
      <Stack gap='16px'>
        <Title order={2}>Facilities</Title>

        <Stack gap='16px'>
          {mockFacilities.map((facility) => (
            <Facility
              key={facility.id}
              facility={facility}
              isSelected={false}
              onSelect={fn()}
            />
          ))}
        </Stack>
      </Stack>
    </div>
  ),
};

export const Selected = {
  render: () => (
    <div style={{ padding: '20px', maxWidth: '375px', margin: '0 auto' }}>
      <Stack gap='16px'>
        <Title order={2}>Facilities</Title>

        <Stack gap='16px'>
          {mockFacilities.map((facility, index) => (
            <Facility
              key={facility.id}
              facility={facility}
              isSelected={index === 0}
              onSelect={fn()}
            />
          ))}
        </Stack>
      </Stack>
    </div>
  ),
};

export const Single = {
  render: () => (
    <div style={{ padding: '20px', maxWidth: '375px', margin: '0 auto' }}>
      <Facility
        facility={mockFacilities[0]}
        isSelected={false}
        onSelect={fn()}
      />
    </div>
  ),
};
