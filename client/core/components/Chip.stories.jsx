import { fn } from 'storybook/test';
import Chip from './Chip';

export default {
  title: 'Components/Chip',
  component: Chip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    active: {
      control: 'boolean',
      description: 'Whether the chip is in active state',
    },
    variant: {
      control: 'select',
      options: ['filter', 'selection'],
      description: 'Chip variant type',
    },
    onClick: {
      action: 'clicked',
    },
  },
};

export const Default = {
  args: {
    children: 'Chip',
    active: false,
    onClick: fn(),
  },
};

export const Active = {
  args: {
    children: 'Active Chip',
    active: true,
    onClick: fn(),
  },
};

export const FilterChip = {
  args: {
    children: 'Current holds',
    active: true,
    variant: 'filter',
    onClick: fn(),
  },
};

export const FilterChipInactive = {
  args: {
    children: 'This week',
    active: false,
    variant: 'filter',
    onClick: fn(),
  },
};

export const SelectionChip = {
  args: {
    children: '1',
    active: false,
    variant: 'selection',
    onClick: fn(),
  },
};

export const SelectionChipActive = {
  args: {
    children: '2',
    active: true,
    variant: 'selection',
    onClick: fn(),
  },
};

export const MultipleChips = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Chip active>Current holds</Chip>
      <Chip active={false}>This week</Chip>
      <Chip active={false}>History</Chip>
    </div>
  ),
};

export const BedCountChips = {
  render: () => (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      <Chip active={false}>1</Chip>
      <Chip active>2</Chip>
      <Chip active={false}>3</Chip>
      <Chip active={false}>4</Chip>
      <Chip active={false}>5</Chip>
    </div>
  ),
};
