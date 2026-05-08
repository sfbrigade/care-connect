import { describe, expect, it } from 'vitest';
import { DateTime } from 'luxon';

import { formatTimelineTimestamp } from '../../utils/format';
import { buildPersonStatusTimeline } from './personStatusTimelineUtils';

const now = DateTime.fromISO('2026-05-08T12:00:00.000-07:00');

function user (firstName, lastName) {
  return { firstName, lastName };
}

describe('formatTimelineTimestamp', () => {
  it('formats today, yesterday, and older dates', () => {
    expect(formatTimelineTimestamp('2026-05-08T09:24:00.000-07:00', now)).toBe('9:24 AM');
    expect(formatTimelineTimestamp('2026-05-07T09:24:00.000-07:00', now)).toBe('Yesterday, 9:24 AM');
    expect(formatTimelineTimestamp('2026-04-29T09:24:00.000-07:00', now)).toBe('Apr 29, 9:24 AM');
  });
});

describe('buildPersonStatusTimeline', () => {
  it('builds custody milestones with detained and muted incomplete future steps', () => {
    const timeline = buildPersonStatusTimeline({
      subjectStatus: 'DETAINED',
      createdAt: '2026-05-08T08:56:00.000-07:00',
      createdBy: user('Jordan', 'Smith'),
    }, { viewerMode: 'custody', now });

    expect(timeline.map(item => item.label)).toEqual([
      'Detained',
      'Arrived at RESET',
      'Custody transferred',
      'Medical intake started',
      'Medical intake completed',
      'Released',
      'Exited',
    ]);
    expect(timeline[0]).toMatchObject({
      active: true,
      completed: true,
      timestamp: '8:56 AM',
      actor: 'J. Smith',
    });
    expect(timeline[1]).toMatchObject({
      active: false,
      completed: false,
      timestamp: null,
      actor: null,
    });
  });

  it('starts care timelines at Arrived at RESET', () => {
    const timeline = buildPersonStatusTimeline({
      subjectStatus: 'ONSITE_AWAITING_TRANSFER',
      createdAt: '2026-05-08T08:56:00.000-07:00',
      arrivedAt: '2026-05-08T09:24:00.000-07:00',
    }, { viewerMode: 'care', now });

    expect(timeline[0]).toMatchObject({
      status: 'ONSITE_AWAITING_TRANSFER',
      label: 'Arrived at RESET',
      active: true,
      completed: true,
      timestamp: '9:24 AM',
      actor: null,
    });
    expect(timeline.some(item => item.status === 'DETAINED')).toBe(false);
  });

  it('uses direct actor fields and audit updates for staff-driven milestones', () => {
    const timeline = buildPersonStatusTimeline({
      subjectStatus: 'EXITED',
      createdAt: '2026-05-08T08:56:00.000-07:00',
      createdBy: user('Jordan', 'Smith'),
      arrivedAt: '2026-05-08T09:24:00.000-07:00',
      transferredAt: '2026-05-08T09:26:00.000-07:00',
      transferredBy: user('Jamie', 'Smith'),
      medicalIntakeStartedAt: '2026-05-08T09:52:00.000-07:00',
      medicalIntakeStartedBy: user('Ana', 'Guevara'),
      deflectionUpdates: [
        {
          subjectStatus: 'IN_CHAIR',
          updatedAt: '2026-05-08T10:12:00.000-07:00',
          updatedBy: user('Samir', 'Patel'),
        },
      ],
      releasedAt: '2026-05-08T19:36:00.000-07:00',
      releasedBy: user('Alice', 'Johnson'),
      exitedAt: '2026-05-08T20:02:00.000-07:00',
      exitedBy: user('Rocky', 'Balboa'),
    }, { viewerMode: 'custody', now });

    expect(timeline.find(item => item.status === 'ONSITE_AWAITING_TRANSFER').actor).toBe(null);
    expect(timeline.find(item => item.status === 'AWAITING_INTAKE')).toMatchObject({ timestamp: '9:26 AM', actor: 'J. Smith' });
    expect(timeline.find(item => item.status === 'IN_MEDICAL_INTAKE')).toMatchObject({ timestamp: '9:52 AM', actor: 'A. Guevara' });
    expect(timeline.find(item => item.status === 'IN_CHAIR')).toMatchObject({ timestamp: '10:12 AM', actor: 'S. Patel' });
    expect(timeline.find(item => item.status === 'RELEASED')).toMatchObject({ timestamp: '7:36 PM', actor: 'A. Johnson' });
    expect(timeline.find(item => item.status === 'EXITED')).toMatchObject({ timestamp: '8:02 PM', actor: 'R. Balboa' });
  });

  it('short-circuits release and exit before in-chair without showing fake intervening milestones', () => {
    const timeline = buildPersonStatusTimeline({
      subjectStatus: 'EXITED',
      createdAt: '2026-04-21T00:11:00.000-07:00',
      createdBy: user('Test', 'SFPD1'),
      arrivedAt: '2026-04-21T00:16:00.000-07:00',
      transferredAt: '2026-04-21T00:38:00.000-07:00',
      transferredBy: user('Test', 'SFSO'),
      releasedAt: '2026-05-08T12:10:00.000-07:00',
      releasedBy: user('Test', 'SFSO'),
      exitedAt: '2026-05-08T12:10:00.000-07:00',
      exitedBy: user('Test', 'SFSO'),
    }, { viewerMode: 'custody', now });

    expect(timeline.map(item => item.status)).toEqual([
      'DETAINED',
      'ONSITE_AWAITING_TRANSFER',
      'AWAITING_INTAKE',
      'RELEASED',
      'EXITED',
    ]);
    expect(timeline.some(item => item.status === 'IN_MEDICAL_INTAKE')).toBe(false);
    expect(timeline.some(item => item.status === 'IN_CHAIR')).toBe(false);
    expect(timeline.find(item => item.status === 'EXITED')).toMatchObject({
      label: 'Exited',
      active: true,
      interrupted: true,
      timestamp: '12:10 PM',
      actor: 'T. SFSO',
    });
  });

  it('marks an in-chair exit to jail without release as an unhappy terminal exit', () => {
    const timeline = buildPersonStatusTimeline({
      subjectStatus: 'EXITED',
      createdAt: '2026-05-08T08:56:00.000-07:00',
      arrivedAt: '2026-05-08T09:24:00.000-07:00',
      transferredAt: '2026-05-08T09:26:00.000-07:00',
      medicalIntakeStartedAt: '2026-05-08T09:52:00.000-07:00',
      deflectionUpdates: [
        {
          subjectStatus: 'IN_CHAIR',
          updatedAt: '2026-05-08T10:12:00.000-07:00',
          updatedBy: user('Samir', 'Patel'),
        },
      ],
      exitedAt: '2026-05-08T11:02:00.000-07:00',
      exitedBy: user('Rocky', 'Balboa'),
      exitDestination: 'JAIL',
    }, { viewerMode: 'custody', now });

    expect(timeline.map(item => item.status)).toEqual([
      'DETAINED',
      'ONSITE_AWAITING_TRANSFER',
      'AWAITING_INTAKE',
      'IN_MEDICAL_INTAKE',
      'IN_CHAIR',
      'EXITED',
    ]);
    expect(timeline.some(item => item.status === 'RELEASED')).toBe(false);
    expect(timeline.at(-1)).toMatchObject({
      status: 'EXITED',
      label: 'Exited (jail)',
      active: true,
      completed: true,
      interrupted: true,
      timestamp: '11:02 AM',
      actor: 'R. Balboa',
    });
  });

  it('marks an in-chair release and exit to hospital as an unhappy terminal exit', () => {
    const timeline = buildPersonStatusTimeline({
      subjectStatus: 'EXITED',
      createdAt: '2026-05-08T08:56:00.000-07:00',
      arrivedAt: '2026-05-08T09:24:00.000-07:00',
      transferredAt: '2026-05-08T09:26:00.000-07:00',
      medicalIntakeStartedAt: '2026-05-08T09:52:00.000-07:00',
      deflectionUpdates: [
        {
          subjectStatus: 'IN_CHAIR',
          updatedAt: '2026-05-08T10:12:00.000-07:00',
          updatedBy: user('Samir', 'Patel'),
        },
      ],
      releasedAt: '2026-05-08T10:58:00.000-07:00',
      releasedBy: user('Alice', 'Johnson'),
      releaseReason: 'MEDICAL_ISSUE',
      exitedAt: '2026-05-08T11:02:00.000-07:00',
      exitedBy: user('Rocky', 'Balboa'),
      exitDestination: 'HOSPITAL',
    }, { viewerMode: 'custody', now });

    expect(timeline.map(item => item.status)).toEqual([
      'DETAINED',
      'ONSITE_AWAITING_TRANSFER',
      'AWAITING_INTAKE',
      'IN_MEDICAL_INTAKE',
      'IN_CHAIR',
      'RELEASED',
      'EXITED',
    ]);
    expect(timeline.find(item => item.status === 'RELEASED')).toMatchObject({
      active: true,
      completed: true,
    });
    expect(timeline.find(item => item.status === 'RELEASED')).not.toHaveProperty('interrupted');
    expect(timeline.at(-1)).toMatchObject({
      status: 'EXITED',
      label: 'Exited (medical)',
      interrupted: true,
      timestamp: '11:02 AM',
    });
  });

  it('marks an in-chair behavioral health release and exit as an unhappy terminal exit', () => {
    const timeline = buildPersonStatusTimeline({
      subjectStatus: 'EXITED',
      createdAt: '2026-05-08T08:56:00.000-07:00',
      arrivedAt: '2026-05-08T09:24:00.000-07:00',
      transferredAt: '2026-05-08T09:26:00.000-07:00',
      medicalIntakeStartedAt: '2026-05-08T09:52:00.000-07:00',
      deflectionUpdates: [
        {
          subjectStatus: 'IN_CHAIR',
          updatedAt: '2026-05-08T10:12:00.000-07:00',
          updatedBy: user('Samir', 'Patel'),
        },
      ],
      releasedAt: '2026-05-08T10:58:00.000-07:00',
      releasedBy: user('Alice', 'Johnson'),
      releaseReason: 'BEHAVIORAL_HEALTH_EVALUATION',
      exitedAt: '2026-05-08T11:02:00.000-07:00',
      exitedBy: user('Rocky', 'Balboa'),
      exitDestination: 'OTHER',
    }, { viewerMode: 'custody', now });

    expect(timeline.at(-1)).toMatchObject({
      status: 'EXITED',
      label: 'Exited (behavioral)',
      interrupted: true,
    });
  });

  it('marks an in-chair release and exit to other destination as an unhappy terminal exit', () => {
    const timeline = buildPersonStatusTimeline({
      subjectStatus: 'EXITED',
      createdAt: '2026-05-08T08:56:00.000-07:00',
      arrivedAt: '2026-05-08T09:24:00.000-07:00',
      transferredAt: '2026-05-08T09:26:00.000-07:00',
      medicalIntakeStartedAt: '2026-05-08T09:52:00.000-07:00',
      deflectionUpdates: [
        {
          subjectStatus: 'IN_CHAIR',
          updatedAt: '2026-05-08T10:12:00.000-07:00',
          updatedBy: user('Samir', 'Patel'),
        },
      ],
      releasedAt: '2026-05-08T10:58:00.000-07:00',
      releasedBy: user('Alice', 'Johnson'),
      releaseReason: 'OTHER',
      exitedAt: '2026-05-08T11:02:00.000-07:00',
      exitedBy: user('Rocky', 'Balboa'),
      exitDestination: 'OTHER',
    }, { viewerMode: 'custody', now });

    expect(timeline.at(-1)).toMatchObject({
      status: 'EXITED',
      label: 'Exited (other)',
      interrupted: true,
    });
  });

  it('leaves the completed in-chair sobered release journey as the happy path', () => {
    const timeline = buildPersonStatusTimeline({
      subjectStatus: 'EXITED',
      createdAt: '2026-05-08T08:56:00.000-07:00',
      arrivedAt: '2026-05-08T09:24:00.000-07:00',
      transferredAt: '2026-05-08T09:26:00.000-07:00',
      medicalIntakeStartedAt: '2026-05-08T09:52:00.000-07:00',
      deflectionUpdates: [
        {
          subjectStatus: 'IN_CHAIR',
          updatedAt: '2026-05-08T10:12:00.000-07:00',
          updatedBy: user('Samir', 'Patel'),
        },
      ],
      releasedAt: '2026-05-08T10:58:00.000-07:00',
      releasedBy: user('Alice', 'Johnson'),
      releaseReason: 'SOBERED',
      exitedAt: '2026-05-08T11:02:00.000-07:00',
      exitedBy: user('Rocky', 'Balboa'),
      exitDestination: 'HOME',
    }, { viewerMode: 'custody', now });

    expect(timeline.map(item => item.status)).toEqual([
      'DETAINED',
      'ONSITE_AWAITING_TRANSFER',
      'AWAITING_INTAKE',
      'IN_MEDICAL_INTAKE',
      'IN_CHAIR',
      'RELEASED',
      'EXITED',
    ]);
    expect(timeline.at(-1)).toMatchObject({
      status: 'EXITED',
      label: 'Exited',
      active: true,
      completed: true,
      timestamp: '11:02 AM',
    });
    expect(timeline.at(-1)).not.toHaveProperty('interrupted');
  });

  it('leaves a sobered released and exited journey blue even when the in-chair timestamp is missing', () => {
    const timeline = buildPersonStatusTimeline({
      subjectStatus: 'EXITED',
      createdAt: '2026-05-08T08:56:00.000-07:00',
      arrivedAt: '2026-05-08T09:24:00.000-07:00',
      transferredAt: '2026-05-08T09:26:00.000-07:00',
      medicalIntakeStartedAt: '2026-05-08T09:52:00.000-07:00',
      releasedAt: '2026-05-08T10:58:00.000-07:00',
      releasedBy: user('Alice', 'Johnson'),
      releaseReason: 'SOBERED',
      exitedAt: '2026-05-08T11:02:00.000-07:00',
      exitedBy: user('Rocky', 'Balboa'),
    }, { viewerMode: 'custody', now });

    expect(timeline.map(item => item.status)).toEqual([
      'DETAINED',
      'ONSITE_AWAITING_TRANSFER',
      'AWAITING_INTAKE',
      'IN_MEDICAL_INTAKE',
      'IN_CHAIR',
      'RELEASED',
      'EXITED',
    ]);
    expect(timeline.find(item => item.status === 'IN_CHAIR')).toMatchObject({
      active: true,
      completed: false,
      timestamp: 'Time unavailable',
    });
    expect(timeline.at(-1)).toMatchObject({
      status: 'EXITED',
      label: 'Exited',
      active: true,
      completed: true,
      timestamp: '11:02 AM',
    });
    expect(timeline.at(-1)).not.toHaveProperty('interrupted');
  });

  it('short-circuits interrupted exits to the exited milestone', () => {
    const timeline = buildPersonStatusTimeline({
      subjectStatus: 'EXITED',
      createdAt: '2026-05-08T08:56:00.000-07:00',
      arrivedAt: '2026-05-08T09:24:00.000-07:00',
      transferredAt: '2026-05-08T09:26:00.000-07:00',
      exitedAt: '2026-05-08T10:02:00.000-07:00',
      exitedBy: user('Rocky', 'Balboa'),
    }, { viewerMode: 'custody', now });

    expect(timeline.map(item => item.status)).toEqual([
      'DETAINED',
      'ONSITE_AWAITING_TRANSFER',
      'AWAITING_INTAKE',
      'EXITED',
    ]);
    expect(timeline.at(-1)).toMatchObject({
      label: 'Exited',
      active: true,
      completed: true,
      interrupted: true,
      timestamp: '10:02 AM',
      actor: 'R. Balboa',
      isExit: true,
    });
  });

  it('marks visual progress by current subject status even when a milestone timestamp is absent', () => {
    const timeline = buildPersonStatusTimeline({
      subjectStatus: 'AWAITING_INTAKE',
      createdAt: '2026-05-07T15:16:00.000-07:00',
      createdBy: user('Test', 'SFPD1'),
      transferredAt: '2026-05-07T15:16:00.000-07:00',
      transferredBy: user('Test', 'SFSO'),
    }, { viewerMode: 'custody', now });

    expect(timeline.find(item => item.status === 'DETAINED')).toMatchObject({ active: true, timestamp: 'Yesterday, 3:16 PM' });
    expect(timeline.find(item => item.status === 'ONSITE_AWAITING_TRANSFER')).toMatchObject({ active: true, completed: false, timestamp: 'Time unavailable' });
    expect(timeline.find(item => item.status === 'AWAITING_INTAKE')).toMatchObject({ active: true, timestamp: 'Yesterday, 3:16 PM' });
    expect(timeline.find(item => item.status === 'IN_MEDICAL_INTAKE')).toMatchObject({ active: false, timestamp: null });
  });

  it('maps every requested subject status threshold to active milestones', () => {
    const expectations = [
      ['DETAINED', ['DETAINED']],
      ['ONSITE_AWAITING_TRANSFER', ['DETAINED', 'ONSITE_AWAITING_TRANSFER']],
      ['AWAITING_INTAKE', ['DETAINED', 'ONSITE_AWAITING_TRANSFER', 'AWAITING_INTAKE']],
      ['IN_MEDICAL_INTAKE', ['DETAINED', 'ONSITE_AWAITING_TRANSFER', 'AWAITING_INTAKE', 'IN_MEDICAL_INTAKE']],
      ['IN_CHAIR', ['DETAINED', 'ONSITE_AWAITING_TRANSFER', 'AWAITING_INTAKE', 'IN_MEDICAL_INTAKE', 'IN_CHAIR']],
      ['RELEASED', ['DETAINED', 'ONSITE_AWAITING_TRANSFER', 'AWAITING_INTAKE', 'IN_MEDICAL_INTAKE', 'IN_CHAIR', 'RELEASED']],
    ];

    for (const [subjectStatus, activeStatuses] of expectations) {
      const timeline = buildPersonStatusTimeline({ subjectStatus }, { viewerMode: 'custody', now });
      expect(timeline.filter(item => item.active).map(item => item.status)).toEqual(activeStatuses);
    }
  });
});
