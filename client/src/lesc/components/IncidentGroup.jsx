import { Box, Stack } from '@mantine/core';

import Incident from './Incident';
import SectionContainer from './SectionContainer';

function IncidentGroup ({ incident, incidentId, editLink, gap = 'md', children }) {
  return (
    <SectionContainer>
      <Stack gap={gap}>
        <Box px='sm'>
          <Incident incident={incident} incidentId={incidentId} editLink={editLink} />
        </Box>
        {children}
      </Stack>
    </SectionContainer>
  );
}

export default IncidentGroup;
