import { fn } from 'storybook/test';
import LESCHold from './LESCHold';

export default {
  title: 'LESC/Hold',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
};

const mockHold = {
  id: '001',
  facilityName: 'LESC',
  serviceTypeName: 'Sobering',
  bedsRequested: 2,
  expiresAt: new Date(Date.now() + 59 * 60 * 1000).toISOString(),
  status: 'ACTIVE',
  notes: '2 individuals sobering',
};

export const Default = {
  render: () => (
    <div style={{ padding: '20px', maxWidth: '375px', margin: '0 auto' }}>
      <LESCHold
        hold={mockHold}
        patientId='001'
        patientName='John Doe'
        patientDob='2000-01-01'
        patientAge={36}
        patientSex='Male'
        patientRace='Caucasian'
        status='in-transit'
        onCancel={fn()}
        onViewDetails={fn()}
      />
    </div>
  ),
};

export const Active = {
  render: () => (
    <div style={{ padding: '20px', maxWidth: '375px', margin: '0 auto' }}>
      <LESCHold
        hold={mockHold}
        patientId='002'
        patientName='Jane Smith'
        patientDob='1995-05-15'
        patientAge={29}
        patientSex='Female'
        patientRace='Hispanic'
        status='active'
        onCancel={fn()}
        onViewDetails={fn()}
      />
    </div>
  ),
};

export const WithoutPatientInfo = {
  render: () => (
    <div style={{ padding: '20px', maxWidth: '375px', margin: '0 auto' }}>
      <LESCHold
        hold={mockHold}
        onCancel={fn()}
        onViewDetails={fn()}
      />
    </div>
  ),
};

export const ExpiringSoon = {
  render: () => {
    const expiringHold = {
      ...mockHold,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      notes: 'Expiring soon',
    };

    return (
      <div style={{ padding: '20px', maxWidth: '375px', margin: '0 auto' }}>
        <LESCHold
          hold={expiringHold}
          patientId='003'
          patientName='Bob Johnson'
          patientDob='1988-12-20'
          patientAge={36}
          patientSex='Male'
          patientRace='African American'
          status='warning'
          onCancel={fn()}
          onViewDetails={fn()}
        />
      </div>
    );
  },
};
