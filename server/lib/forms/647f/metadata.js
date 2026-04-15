export const metadata = {
  title: 'SFPD 647(f) Report',
  description: (name) => `SFPD 647(f) Report for ${name}`,
  downloadFilename: (id) => `647f-report-${id}.pdf`,

  canGenerate () {
    return true; // No preconditions — can be generated at any point in the deflection lifecycle
  },

  deflectionInclude: {
    subject: true,
    incident: {
      include: {
        createdBy: {
          include: {
            organization: true,
            unit: true,
          },
        },
        incidentOfficers: {
          include: {
            officer: {
              include: {
                organization: true,
                unit: true,
              },
            },
            organization: true,
            unit: true,
          },
        },
      },
    },
    facility: true,
    createdBy: {
      include: {
        organization: true,
        unit: true,
      },
    },
  },
};
