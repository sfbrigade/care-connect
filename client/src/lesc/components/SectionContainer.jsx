import { Box } from '@mantine/core';

function SectionContainer ({ children }) {
  return (
    <Box
      style={{
        backgroundColor: 'var(--mantine-color-gray-1)',
        borderRadius: 'var(--mantine-radius-xl)',
        padding: 'var(--mantine-spacing-md)',
      }}
    >
      {children}
    </Box>
  );
}

export default SectionContainer;
