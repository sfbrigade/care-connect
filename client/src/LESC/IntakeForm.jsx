import { useState } from 'react';
import { Container, Stack, Text, Textarea, Button, Group, Select, TextInput } from '@mantine/core';
import { useNavigate, useLocation } from 'react-router';
import { IconArrowLeft } from '@tabler/icons-react';
import Api from '../Api';

/**
 * Intake Form component - matches Figma "Start Report / Intake Form" design
 * Placeholder implementation matching design structure
 */
function IntakeForm () {
  const navigate = useNavigate();
  const location = useLocation();
  const holdId = location.state?.holdId;

  const [formData, setFormData] = useState({
    fullName: '',
    dateOfBirth: '',
    sex: '',
    race: '',
    personallyIdentifiable: '',
    observedBehavior: '',
    observationDetails: '',
    faceNormal: '',
    speechClear: '',
    odorOfAlcohol: '',
    medicalClearance: '',
    itemsTracked: '',
    arrestType: '',
    cadNumber: '',
    officerId: '',
    locationOfArrest: '',
    timeOfArrest: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await Api.lesc.intake.create({
        holdId,
        ...formData,
      });
      navigate('/lesc/availability');
    } catch (error) {
      console.error('Failed to submit intake form', error);
      // Would show error message to user
    }
  };

  return (
    <Container>
      <Stack gap='md'>
        <Button
          leftSection={<IconArrowLeft size={18} />}
          variant='light'
          onClick={() => navigate(-1)}
          style={{ alignSelf: 'flex-start' }}
        >
          Back
        </Button>

        <form onSubmit={handleSubmit}>
          <Stack gap='xl'>
            {/* Subject Information */}
            <Stack gap='sm'>
              <Text
                style={{
                  fontSize: '24px',
                  lineHeight: '32px',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 700,
                  color: '#000000',
                }}
              >
                Subject Information
              </Text>
              <TextInput
                label='Full Name (FN / LN)'
                placeholder='Enter full name'
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              />
              <TextInput
                label='Date of Birth'
                type='date'
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
              <Select
                label='Sex'
                placeholder='Select sex'
                data={['Male', 'Female', 'Other']}
                value={formData.sex}
                onChange={(value) => setFormData({ ...formData, sex: value })}
              />
              <Select
                label='Race'
                placeholder='Select race'
                data={['White', 'Black', 'Hispanic', 'Asian', 'Other']}
                value={formData.race}
                onChange={(value) => setFormData({ ...formData, race: value })}
              />
              <Select
                label='Is subject personally identifiable?'
                placeholder='Select'
                data={['Yes', 'No']}
                value={formData.personallyIdentifiable}
                onChange={(value) => setFormData({ ...formData, personallyIdentifiable: value })}
              />
            </Stack>

            {/* Observation */}
            <Stack gap='sm'>
              <Text
                style={{
                  fontSize: '24px',
                  lineHeight: '32px',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 700,
                  color: '#000000',
                }}
              >
                Observation (Reason for 647f)
              </Text>
              <TextInput
                label='Observed behavior'
                placeholder='Enter observed behavior'
                value={formData.observedBehavior}
                onChange={(e) => setFormData({ ...formData, observedBehavior: e.target.value })}
              />
              <Textarea
                label='Observation details (optional)'
                placeholder='Enter details'
                value={formData.observationDetails}
                onChange={(e) => setFormData({ ...formData, observationDetails: e.target.value })}
                rows={3}
              />
              <Text
                style={{
                  fontSize: '18px',
                  lineHeight: '28px',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 400,
                  color: '#000000',
                }}
              >
                Photo evidence (optional)
              </Text>
            </Stack>

            {/* Medical and Safety Check */}
            <Stack gap='sm'>
              <Text
                style={{
                  fontSize: '24px',
                  lineHeight: '32px',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 700,
                  color: '#000000',
                }}
              >
                Medical and Safety Check
              </Text>
              <Select
                label='Face appears normal?'
                placeholder='Select'
                data={['Yes', 'No']}
                value={formData.faceNormal}
                onChange={(value) => setFormData({ ...formData, faceNormal: value })}
              />
              <Select
                label='Speech is clear?'
                placeholder='Select'
                data={['Yes', 'No']}
                value={formData.speechClear}
                onChange={(value) => setFormData({ ...formData, speechClear: value })}
              />
              <Select
                label='Odor of alcohol?'
                placeholder='Select'
                data={['Yes', 'No']}
                value={formData.odorOfAlcohol}
                onChange={(value) => setFormData({ ...formData, odorOfAlcohol: value })}
              />
              <Select
                label='Medical clearance obtained?'
                placeholder='Select'
                data={['Yes', 'No']}
                value={formData.medicalClearance}
                onChange={(value) => setFormData({ ...formData, medicalClearance: value })}
              />
            </Stack>

            {/* Belongings */}
            <Stack gap='sm'>
              <Text
                style={{
                  fontSize: '24px',
                  lineHeight: '32px',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 700,
                  color: '#000000',
                }}
              >
                Belongings (optional)
              </Text>
              <TextInput
                label='Items being tracked'
                placeholder='Enter items'
                value={formData.itemsTracked}
                onChange={(e) => setFormData({ ...formData, itemsTracked: e.target.value })}
              />
              <Text
                style={{
                  fontSize: '18px',
                  lineHeight: '28px',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 400,
                  color: '#000000',
                }}
              >
                Upload photos
              </Text>
            </Stack>

            {/* Arrest Info */}
            <Stack gap='sm'>
              <Text
                style={{
                  fontSize: '24px',
                  lineHeight: '32px',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 700,
                  color: '#000000',
                }}
              >
                Arrest Info
              </Text>
              <Text
                style={{
                  fontSize: '18px',
                  lineHeight: '28px',
                  fontFamily: 'Roboto, sans-serif',
                  fontWeight: 400,
                  color: '#000000',
                }}
              >
                Arrest Type
              </Text>
              <ul style={{ marginLeft: '20px', paddingLeft: '8px' }}>
                <li>647(f) PC RWS</li>
                <li>849(b) (if released at center)</li>
              </ul>
              <TextInput
                label='CAD # (Call ID for evidence tagging)'
                placeholder='Enter CAD number'
                value={formData.cadNumber}
                onChange={(e) => setFormData({ ...formData, cadNumber: e.target.value })}
              />
              <TextInput
                label='Officer ID / Badge #'
                placeholder='Enter officer ID'
                value={formData.officerId}
                onChange={(e) => setFormData({ ...formData, officerId: e.target.value })}
              />
              <TextInput
                label='Location of arrest'
                placeholder='Enter location'
                value={formData.locationOfArrest}
                onChange={(e) => setFormData({ ...formData, locationOfArrest: e.target.value })}
              />
              <TextInput
                label='Time of arrest'
                type='datetime-local'
                value={formData.timeOfArrest}
                onChange={(e) => setFormData({ ...formData, timeOfArrest: e.target.value })}
              />
            </Stack>

            <Group justify='space-between' mt='md'>
              <Button variant='light' onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type='submit'>
                Submit
              </Button>
            </Group>
          </Stack>
        </form>
      </Stack>
    </Container>
  );
}

export default IntakeForm;

