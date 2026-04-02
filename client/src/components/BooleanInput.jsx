import { Chip, Group, Input } from '@mantine/core';
import { useUncontrolled } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';

function BooleanInput ({ label, description, required, error, disabled, value, children, defaultValue, onChange, ...props }) {
  const { t } = useTranslation();
  const normalizedValue = (typeof value === 'boolean') ? (value ? 'true' : 'false') : undefined;
  const normalizedDefaultValue = (typeof defaultValue === 'boolean') ? (defaultValue ? 'true' : 'false') : undefined;
  const [_value, setValue] = useUncontrolled({
    value: normalizedValue,
    defaultValue: normalizedDefaultValue,
    onChange: (newValue) => {
      onChange?.(newValue === 'true');
    },
  });

  return (
    <Input.Wrapper label={label} description={description} required={required} error={error} disabled={disabled}>
      {children}
      <Chip.Group
        {...props}
        value={_value ?? undefined}
        onChange={setValue}
      >
        <Group gap='sm' mt='md'>
          <Chip value='true' disabled={disabled} wrapperProps={{ 'data-error': !!error }}>{t('ternary.YES')}</Chip>
          <Chip value='false' disabled={disabled} wrapperProps={{ 'data-error': !!error }}>{t('ternary.NO')}</Chip>
        </Group>
      </Chip.Group>
    </Input.Wrapper>
  );
}

export default BooleanInput;
