import { Chip, Group, Input } from '@mantine/core';
import { useUncontrolled } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';

function BooleanInput ({ label, value, defaultValue, onChange, error, ...props }) {
  const { t } = useTranslation();
  const [_value, setValue] = useUncontrolled({
    value: (typeof value === 'boolean') ? (value ? 'true' : 'false') : value,
    defaultValue: (typeof defaultValue === 'boolean') ? (defaultValue ? 'true' : 'false') : defaultValue,
    onChange: (newValue) => {
      onChange?.(newValue === 'true');
    },
  });

  return (
    <Input.Wrapper label={label} error={error}>
      <Chip.Group
        {...props}
        value={_value}
        onChange={setValue}
      >
        <Group gap='sm' mt='md'>
          <Chip value='true'>{t('ternary.YES')}</Chip>
          <Chip value='false'>{t('ternary.NO')}</Chip>
        </Group>
      </Chip.Group>
    </Input.Wrapper>
  );
}

export default BooleanInput;
