import { Box, Progress, Text } from '@mantine/core';

function PasswordStrength ({ password }) {
  let strength = 0;
  if (password?.length > 0) {
    strength += 1;
    if (password?.length >= 12) {
      strength += 1;
      const parts = password.trim().split(' ');
      strength += Math.min(parts.length - 1, 2);
    }
  }
  return (
    <Box>
      <Text size='sm'>Password strength: <b>{strength < 2 ? 'Weak' : strength < 3 ? 'Medium' : 'Strong'}</b></Text>
      <Progress size='xs' my='sm' color={strength < 2 ? 'red' : strength < 3 ? 'yellow' : 'green'} value={strength * 25} />
      <Text size='sm' c='dimmed'>Use at least 12 characters. To create a strong password, use 3–5 unrelated words or a memorable phrase that is long but easy to remember.</Text>
    </Box>
  );
}

export default PasswordStrength;
