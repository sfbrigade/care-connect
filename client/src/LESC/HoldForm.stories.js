import { fn } from '@storybook/test';
import { Stack, Textarea, Button, Select, Text } from '@mantine/core';
import Chip from '../Components/Chip';
import { useState } from 'react';

export default {
  title: 'LESC/HoldForm',
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export const Default = {
  render: () => {
    const [bedsRequested, setBedsRequested] = useState(1);
    const [notes, setNotes] = useState('');
    
    return (
      <div style={{ width: '335px', padding: '20px' }}>
        <Stack gap="24px">
          <div>
            <Text
              style={{
                fontSize: '18px',
                lineHeight: '28px',
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 400,
                color: '#000000',
                marginBottom: '8px',
              }}
            >
              Hold Details
            </Text>
          </div>
          
          <Stack gap="8px">
            <Text
              style={{
                fontSize: '18px',
                lineHeight: '28px',
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 400,
                color: '#000000',
              }}
            >
              For how many people?
            </Text>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5].map((num) => (
                <Chip
                  key={num}
                  active={bedsRequested === num}
                  onClick={() => setBedsRequested(num)}
                >
                  {num}
                </Chip>
              ))}
            </div>
          </Stack>
          
          <div>
            <Text
              style={{
                fontSize: '18px',
                lineHeight: '28px',
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 400,
                color: '#000000',
                marginBottom: '8px',
              }}
            >
              Notes (optional)
            </Text>
            <Textarea
              placeholder="2 individuals sobering, no medical clearance needed"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              style={{
                borderRadius: '16px',
              }}
            />
          </div>
          
          <Text
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#868e96',
            }}
          >
            Holds will expire automatically after selected time unless extended.
          </Text>
          
          <Group justify="flex-end" gap="8px">
            <Button variant="light" onClick={fn()}>
              Cancel
            </Button>
            <Button onClick={fn()}>
              Create Hold
            </Button>
          </Group>
        </Stack>
      </div>
    );
  },
};

export const WithFacilitySelect = {
  render: () => {
    const [facilityId, setFacilityId] = useState('');
    const [bedsRequested, setBedsRequested] = useState(1);
    const [notes, setNotes] = useState('');
    
    const facilities = [
      { value: '1', label: 'LESC (8 available)' },
      { value: '2', label: 'Other Facility (5 available)' },
    ];
    
    return (
      <div style={{ width: '335px', padding: '20px' }}>
        <Stack gap="24px">
          <div>
            <Text
              style={{
                fontSize: '18px',
                lineHeight: '28px',
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 400,
                color: '#000000',
                marginBottom: '8px',
              }}
            >
              Hold Details
            </Text>
          </div>
          
          <Select
            label="Facility"
            placeholder="Select facility"
            data={facilities}
            value={facilityId}
            onChange={setFacilityId}
            required
            searchable
          />
          
          <Stack gap="8px">
            <Text
              style={{
                fontSize: '18px',
                lineHeight: '28px',
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 400,
                color: '#000000',
              }}
            >
              For how many people?
            </Text>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5].map((num) => (
                <Chip
                  key={num}
                  active={bedsRequested === num}
                  onClick={() => setBedsRequested(num)}
                >
                  {num}
                </Chip>
              ))}
            </div>
          </Stack>
          
          <div>
            <Text
              style={{
                fontSize: '18px',
                lineHeight: '28px',
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 400,
                color: '#000000',
                marginBottom: '8px',
              }}
            >
              Notes (optional)
            </Text>
            <Textarea
              placeholder="Additional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              style={{
                borderRadius: '16px',
              }}
            />
          </div>
          
          <Text
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#868e96',
            }}
          >
            Holds will expire automatically after selected time unless extended.
          </Text>
          
          <Group justify="flex-end" gap="8px">
            <Button variant="light" onClick={fn()}>
              Cancel
            </Button>
            <Button onClick={fn()} disabled={!facilityId}>
              Create Hold
            </Button>
          </Group>
        </Stack>
      </div>
    );
  },
};

export const FilledForm = {
  render: () => {
    const [bedsRequested] = useState(2);
    const [notes] = useState('2 individuals sobering, no medical clearance needed');
    
    return (
      <div style={{ width: '335px', padding: '20px' }}>
        <Stack gap="24px">
          <div>
            <Text
              style={{
                fontSize: '18px',
                lineHeight: '28px',
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 400,
                color: '#000000',
                marginBottom: '8px',
              }}
            >
              Hold Details
            </Text>
          </div>
          
          <Stack gap="8px">
            <Text
              style={{
                fontSize: '18px',
                lineHeight: '28px',
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 400,
                color: '#000000',
              }}
            >
              For how many people?
            </Text>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[1, 2, 3, 4, 5].map((num) => (
                <Chip
                  key={num}
                  active={bedsRequested === num}
                  onClick={fn()}
                >
                  {num}
                </Chip>
              ))}
            </div>
          </Stack>
          
          <div>
            <Text
              style={{
                fontSize: '18px',
                lineHeight: '28px',
                fontFamily: 'Roboto, sans-serif',
                fontWeight: 400,
                color: '#000000',
                marginBottom: '8px',
              }}
            >
              Notes (optional)
            </Text>
            <Textarea
              value={notes}
              onChange={fn()}
              rows={4}
              style={{
                borderRadius: '16px',
              }}
            />
          </div>
          
          <Text
            style={{
              fontSize: '14px',
              lineHeight: '20px',
              fontFamily: 'Roboto, sans-serif',
              fontWeight: 400,
              color: '#868e96',
            }}
          >
            Holds will expire automatically after selected time unless extended.
          </Text>
          
          <Group justify="flex-end" gap="8px">
            <Button variant="light" onClick={fn()}>
              Cancel
            </Button>
            <Button onClick={fn()} loading={false}>
              Create Hold
            </Button>
          </Group>
        </Stack>
      </div>
    );
  },
};

