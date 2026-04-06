import { describe, expect, it } from 'vitest';

import { build849bReleaseNarrative } from './releaseNarrative';

describe('releaseNarrative', () => {
  it('builds the 849(b) narrative from incident and 647(f) details', () => {
    expect(build849bReleaseNarrative({
      incident: {
        caseNumber: 'CASE-123',
        cadNumber: 'CAD-456',
      },
      behavior: 'Subject was unsteady on their feet.',
    })).toBe([
      'Incident number: CASE-123',
      'Cad number: CAD-456',
      'Subject was brought to RESET because they were found to be under the influence of a controlled substance or alcohol in a public location. Upon being able to care for themselves, they were released from their detention.',
      '',
      'The SFPD Officer who brought the person to RESET recorded the following observations on the 647(f) documentation:',
      'Subject was unsteady on their feet.',
    ].join('\n'));
  });

  it('uses SEE ABOVE when incident details or 647(f) narrative are missing', () => {
    expect(build849bReleaseNarrative({
      incident: {},
      behavior: '',
    })).toBe([
      'Incident number: SEE ABOVE',
      'Cad number: SEE ABOVE',
      'Subject was brought to RESET because they were found to be under the influence of a controlled substance or alcohol in a public location. Upon being able to care for themselves, they were released from their detention.',
      '',
      'The SFPD Officer who brought the person to RESET recorded the following observations on the 647(f) documentation:',
      'SEE ABOVE',
    ].join('\n'));
  });
});
