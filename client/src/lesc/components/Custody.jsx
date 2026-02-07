import { useState } from 'react';
import { Container, SegmentedControl, Stack, Text } from '@mantine/core';
import { Head } from '@unhead/react';

function Custody () {
  const [tab, setTab] = useState('in-custody');
  return (
    <>
      <Head>
        <title>Custody</title>
      </Head>
      <Container>
        <Stack gap='xl'>
          <SegmentedControl
            fullWidth
            value={tab}
            onChange={setTab}
            data={[
              { label: 'In Custody', value: 'in-custody' },
              { label: 'Released', value: 'released' },
            ]}
          />
          {tab === 'in-custody' && (
            <>
              <Text>In Custody</Text>
            </>
          )}
          {tab === 'released' && (
            <>
              <Text>Released</Text>
            </>
          )}
        </Stack>
      </Container>
    </>
  );
}

export default Custody;
