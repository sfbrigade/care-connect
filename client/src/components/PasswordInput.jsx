import { useState } from 'react';
import { ActionIcon, TextInput } from '@mantine/core';
import { IconEye, IconEyeOff } from '@tabler/icons-react';

function PasswordInput (props) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  return (
    <TextInput
      {...props}
      type={passwordVisible ? 'text' : 'password'}
      rightSection={
        <ActionIcon
          variant='transparent'
          onClick={() => setPasswordVisible(!passwordVisible)}
        >
          {passwordVisible
            ? (
              <IconEyeOff size={20} color='#868e96' />
              )
            : (
              <IconEye size={20} color='#868e96' />
              )}
        </ActionIcon>
            }
    />
  );
}

export default PasswordInput;
