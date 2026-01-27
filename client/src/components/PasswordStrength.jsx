import { Box, Progress, Text } from '@mantine/core';

import { getPasswordStrengthScore } from '@/utils/passwordStrength';

function PasswordStrength ({ password }) {
  const strength = getPasswordStrengthScore(password);
  return (
    <Box>
      <Text size='sm'>Password strength: <b>{strength < 2 ? 'Weak' : strength < 3 ? 'Medium' : 'Strong'}</b></Text>
      <Progress size='xs' my='sm' color={strength < 2 ? 'red' : strength < 3 ? 'yellow' : 'green'} value={strength * 25} />
      <Text size='sm' c='dimmed'>Use at least 12 characters. To create a strong password, use 3–5 unrelated words or a memorable phrase that is long but easy to remember.</Text>
    </Box>
  );
}

export default PasswordStrength;
