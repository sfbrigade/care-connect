import { Anchor, Box, Group, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import { useStaticContext } from '@/StaticContext';

// Banner height in px. Exported so AppLayout can reserve matching header
// space; otherwise AppShell.Header pins to viewport top and the banner gets
// rendered behind it on mobile.
export const ENVIRONMENT_BANNER_HEIGHT = 40;

// Fallback production URL surfaced in the banner. VITE_PRODUCTION_URL_OVERRIDE
// can override this at deploy time (e.g. a staging environment that wants to
// point users at a different "prod"), but the fallback ensures a misconfigured
// deploy never strands users on a non-prod page without a link out.
const DEFAULT_PRODUCTION_URL = 'https://reset.careconnect.sf.gov/login';

// Single source of truth for the visibility check. AppLayout uses this to
// decide whether to add the banner's height to the AppShell header config;
// the component itself short-circuits to null with the same predicate.
export function shouldShowEnvironmentBanner (env) {
  return env?.VITE_ENVIRONMENT_LABEL !== 'PROD';
}

// Surfaces a non-dismissable warning across the top of every page when the
// build is anything other than production (issue #760). Default-deny: only an
// explicit VITE_ENVIRONMENT_LABEL=PROD hides it. A misconfigured non-prod
// deploy without the env var loudly shows the banner — that's the safe
// failure mode we want.
function EnvironmentBanner () {
  const { env } = useStaticContext();
  const prodUrl = env?.VITE_PRODUCTION_URL_OVERRIDE || DEFAULT_PRODUCTION_URL;

  if (!shouldShowEnvironmentBanner(env)) return null;

  return (
    <Box
      bg='yellow.4'
      h={ENVIRONMENT_BANNER_HEIGHT}
      px='md'
      role='alert'
      data-testid='environment-banner'
      style={{ borderBottom: '2px solid var(--mantine-color-yellow-7)', overflow: 'hidden' }}
    >
      <Group justify='center' gap='sm' wrap='nowrap' h='100%' style={{ minWidth: 0 }}>
        <IconAlertTriangle size={20} color='var(--mantine-color-dark-7)' style={{ flexShrink: 0 }} />
        <Text fw={700} c='dark.9' size='sm' style={{ flexShrink: 0 }}>
          This is a test site.
        </Text>
        <Anchor
          href={prodUrl}
          fw={700}
          c='dark.9'
          size='sm'
          td='underline'
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}
        >
          Go to CareConnect →
        </Anchor>
      </Group>
    </Box>
  );
}

export default EnvironmentBanner;
