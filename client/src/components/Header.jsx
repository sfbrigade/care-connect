import { Box, Container } from '@mantine/core';
import classNames from 'classnames';

import { useStaticContext } from '@/StaticContext';
import { ENVIRONMENT_BANNER_HEIGHT, shouldShowEnvironmentBanner } from '@/components/EnvironmentBanner';

import classes from './Header.module.css';

// This is the page-level "fixed at viewport top" header that some detail/form
// pages use as their own custom header (with a back button, etc.). It would
// otherwise overlay the EnvironmentBanner because both want to live at top: 0.
// We offset by the banner's height when the banner is showing so the banner
// stays visible above this header.
function Header ({ children, className }) {
  const { env } = useStaticContext();
  const top = shouldShowEnvironmentBanner(env) ? ENVIRONMENT_BANNER_HEIGHT : 0;
  return (
    <Box className={classNames(classes.header, className)} style={{ top }}>
      <Container className={classes.headerContainer}>
        {children}
      </Container>
    </Box>
  );
}

export default Header;
