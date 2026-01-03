import { Button } from '@mantine/core';
import { Link } from 'react-router';

function IconButtonLink ({ to, icon: Icon }) {
  return (
    <Button color='rgb(from var(--mantine-color-gray-6) R G B / 0.1)' c='black' w={44} p={0} h={44} component={Link} to={to}>
      <Icon size={20} />
    </Button>
  );
}

export default IconButtonLink;
