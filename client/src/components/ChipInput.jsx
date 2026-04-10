import { Chip, Group, Input } from '@mantine/core';

function ChipInput ({ label, description, required, error, options, ...props }) {
  return (
    <Input.Wrapper label={label} description={description} required={required} error={error}>
      <Chip.Group
        {...props}
      >
        <Group gap='sm' mt='md'>
          {options.map((option) => (
            <Chip key={option.value} value={option.value} wrapperProps={{ 'data-error': !!error }}>{option.label}</Chip>
          ))}
        </Group>
      </Chip.Group>
    </Input.Wrapper>
  );
}

export default ChipInput;
