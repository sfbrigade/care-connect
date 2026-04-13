export const metadata = {
  title: 'Certificate of Release',
  generateLabel: 'Generate Certificate of Release',
  description: (name) => `SF Sheriff's Dept Certificate of Release for ${name}`,
  downloadFilename: (id) => `cert-${id}.pdf`,

  canGenerate (deflection) {
    return deflection.releasedAt
      ? true
      : { message: 'The Certificate of Release can only be generated after the subject has been released.' };
  },

  deflectionInclude: {
    subject: true,
    incident: {
      include: {
        createdByOrganization: true,
        createdByUnit: true,
        createdByTitle: true,
      },
    },
    createdBy: {
      include: {
        organization: true,
        unit: true,
        title: true,
      },
    },
    releasedBy: {
      include: {
        organization: true,
        unit: true,
        title: true,
      },
    },
  },
};
