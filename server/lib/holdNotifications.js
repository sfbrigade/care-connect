import mailer from '#lib/mailer.js';

function getPersonName (deflection) {
  if (!deflection.subject) return null;
  return [deflection.subject.firstName, deflection.subject.lastName].filter(Boolean).join(' ') || null;
}

/**
 * Send cancellation emails to officers whose holds were canceled by someone else.
 * Groups multiple holds per officer into a single email.
 *
 * @param {Array} deflections - Canceled deflections with createdBy and subject relations
 * @param {string} facilityName - Name of the facility
 * @param {string} canceledById - ID of the user who canceled the holds
 */
export async function sendHoldCanceledEmails (deflections, facilityName, canceledById) {
  // Group by officer, excluding self-cancellations
  const byOfficer = {};
  for (const deflection of deflections) {
    if (deflection.createdById === canceledById) continue;
    if (!deflection.createdBy?.email) continue;

    if (!byOfficer[deflection.createdById]) {
      byOfficer[deflection.createdById] = {
        officer: deflection.createdBy,
        holds: [],
      };
    }
    byOfficer[deflection.createdById].holds.push({
      id: deflection.id,
      personName: getPersonName(deflection),
    });
  }

  // Send one email per officer
  const emails = Object.values(byOfficer).map(({ officer, holds }) =>
    mailer.send({
      message: {
        to: `${officer.firstName} ${officer.lastName} <${officer.email}>`,
      },
      template: 'hold-canceled',
      locals: {
        firstName: officer.firstName,
        facilityName,
        holds,
      },
    })
  );

  await Promise.all(emails);
}

/**
 * Send reopening emails to officers whose holds were canceled during a facility closure.
 *
 * @param {Array} officers - Unique officer User records with email
 * @param {string} facilityName - Name of the facility
 */
export async function sendFacilityReopenedEmails (officers, facilityName) {
  const emails = officers.map((officer) =>
    mailer.send({
      message: {
        to: `${officer.firstName} ${officer.lastName} <${officer.email}>`,
      },
      template: 'facility-reopened',
      locals: {
        firstName: officer.firstName,
        facilityName,
      },
    })
  );

  await Promise.all(emails);
}
