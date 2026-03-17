import React from 'react';
import { Button } from '@mantine/core';

function SectionEditButton ({ children = 'Edit', ...props }) {
  return (
    <Button
      variant='secondary'
      size='md'
      {...props}
    >
      {children}
    </Button>
  );
}

export default SectionEditButton;
