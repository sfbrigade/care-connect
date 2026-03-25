import { Box } from '@mantine/core';

function TallymarkSeparator () {
  return (
    <Box
      w={20}
      h={20}
      aria-hidden='true'
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Box
        w={2}
        h={14}
        bg='gray.3'
        style={{
          borderRadius: '999px',
        }}
      />
    </Box>
  );
}

export default TallymarkSeparator;
