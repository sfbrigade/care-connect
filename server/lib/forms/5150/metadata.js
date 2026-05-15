export const metadata = {
  title: '5150 Application (DHCS-1801)',
  description: (name) => `5150 Application (DHCS-1801) for ${name}`,
  downloadFilename: (id) => `5150-application-${id}.pdf`,

  // Eligible only when the SFSO Custody flow legally released the subject for
  // behavioral-health evaluation. The release route is the only writer of
  // `releaseReason`, so this predicate is implicitly Custody-driven; CARE
  // actions can never produce a 5150-eligible deflection (issue #875).
  canGenerate (deflection) {
    if (deflection.releaseReason !== 'BEHAVIORAL_HEALTH_EVALUATION') {
      return { message: 'The 5150 Application can only be generated for releases with reason "Behavioral Health Evaluation".' };
    }
    if (!deflection.releasedAt) {
      return { message: 'The 5150 Application can only be generated after legal release.' };
    }
    return true;
  },

  deflectionInclude: {
    subject: true,
    facility: true,
    incident: true,
    releasedBy: {
      include: {
        title: true,
      },
    },
  },
};
