import { fn } from 'storybook/test';

import Facility from './Facility';

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
export default {
  title: 'Components/Facility',
  component: Facility,
  parameters: {
    // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
    layout: 'centered',
  },
  // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
  tags: ['autodocs'],
  // More on argTypes: https://storybook.js.org/docs/api/argtypes
  argTypes: {
  },
  // Use `fn` to spy on the onClick arg, which will appear in the actions panel once invoked: https://storybook.js.org/docs/essentials/actions#story-args
  args: { onClick: fn() },
};

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Card = {
  args: {
    facility: {
      id: '5c3d2ca3-a38d-4d88-b7d2-3ba0437fbccc',
      name: 'Test Facility',
      slug: 'test-facility',
      distanceMiles: 1.2,
      primaryBadge: 'Open',
      primaryService: 'Medical Help',
      displayAddress: '123 Test St',
      neighborhoodLabel: 'Test Neighborhood',
    },
    isSelected: false
  },
};
