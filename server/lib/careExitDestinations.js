import prismaPkg from '@prisma/client';

const { DeflectionExitDestinationEnum } = prismaPkg;

// Care users record exits to non-jail destinations only. Jail outcomes are
// recorded by custody via /exit-to-jail, which sets exitDestination: 'JAIL'
// directly and generates the 849(b). Keep this list aligned with the chip
// filter in client/src/lesc/components/care/CareExitDetails.jsx.
export const CARE_EXIT_DESTINATIONS = Object.values(DeflectionExitDestinationEnum)
  .filter((destination) => destination !== 'JAIL');
