export const metadata = {
  title: 'SFPD 647(f) Report',
  description: (name) => `SFPD 647(f) Report for ${name}`,
  downloadFilename: (id) => `647f-report-${id}.pdf`,

  canGenerate (deflection) {
    return deflection.transferredAt
      ? true
      : { message: 'This document is not available yet.' };
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
        createdByTitle: true,
        createdByUnit: true,
        createdByOrganization: true,
      },
    },
    facility: true,
    handoffs: {
      include: {
        toOfficer: {
          include: {
            organization: true,
            unit: true,
            title: true,
          },
        },
      },
    },
    createdBy: {
      include: {
        organization: true,
        unit: true,
        title: true,
      },
    },
  },
};
