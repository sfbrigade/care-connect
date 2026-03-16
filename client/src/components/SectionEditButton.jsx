import React from 'react';
import { Button } from '@mantine/core';

const sectionEditButtonStyles = {
  root: {
    display: 'flex',
    padding: '8px 20px',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
    borderRadius: '32px',
    background: 'rgba(76, 110, 245, 0.10)',
  },
};

function SectionEditButton ({ children = 'Edit', ...props }) {
  return (
    <Button
      variant='secondary'
      styles={sectionEditButtonStyles}
      {...props}
    >
      {children}
    </Button>
  );
}

export default SectionEditButton;
