export const metadata = {
  title: 'SFSO 849(b) Report',
  description: (name) => `SFSO 849(b) Report for ${name}`,
  downloadFilename: (id) => `849b-report-${id}.pdf`,

  canGenerate (deflection) {
    return deflection.releasedAt || (deflection.exitDestinationId === 'jail' && deflection.exitedAt)
      ? true
      : { message: 'The SFSO 849(b) Report can only be generated after the subject has been released or exited to jail.' };
  },

  deflectionInclude: {
    subject: true,
    incident: {
      include: {
        createdBy: {
          include: {
            organization: true,
            unit: true,
            title: true,
          },
        },
      },
    },
    releaseReason: true,
    exitDestination: true,
  },
};
