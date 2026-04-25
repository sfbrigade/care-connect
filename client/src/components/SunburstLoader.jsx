import { forwardRef } from 'react';
import { Box } from '@mantine/core';

import classes from './SunburstLoader.module.css';

/**
 * Radial/sunburst spinner from the Figma design, used for loading states on
 * indigo-background buttons (e.g., "Placing hold..." in Holds.jsx).
 *
 * Fixed 20x20 and hardcoded white fill — intended for dark/primary surfaces.
 * For other contexts, use Mantine's built-in <Loader> with an appropriate
 * type/size/color.
 */
const SunburstLoader = forwardRef(function SunburstLoader (props, ref) {
  return (
    <Box component='span' ref={ref} className={classes.sunburstLoader} {...props}>
      <svg
        xmlns='http://www.w3.org/2000/svg'
        width='20'
        height='20'
        viewBox='0 0 20 20'
        fill='none'
        aria-hidden='true'
        focusable='false'
      >
        <path
          fillRule='evenodd'
          clipRule='evenodd'
          d='M10 0C10.5523 0 11 0.447715 11 1V4C11 4.55228 10.5523 5 10 5C9.44771 5 9 4.55228 9 4V1C9 0.447715 9.44771 0 10 0ZM2.89287 2.89287C3.28339 2.50234 3.91656 2.50234 4.30708 2.89287L6.45708 5.04287C6.84761 5.43339 6.84761 6.06656 6.45708 6.45708C6.06656 6.84761 5.43339 6.84761 5.04287 6.45708L2.89287 4.30708C2.50234 3.91656 2.50234 3.28339 2.89287 2.89287ZM17.1071 2.89287C17.4976 3.28339 17.4976 3.91656 17.1071 4.30708L14.9571 6.45708C14.5666 6.84761 13.9334 6.84761 13.5429 6.45708C13.1524 6.06656 13.1524 5.43339 13.5429 5.04287L15.6929 2.89287C16.0834 2.50234 16.7166 2.50234 17.1071 2.89287ZM0 10C0 9.44771 0.447715 9 1 9H4C4.55228 9 5 9.44771 5 10C5 10.5523 4.55228 11 4 11H1C0.447715 11 0 10.5523 0 10ZM15 10C15 9.44771 15.4477 9 16 9H19C19.5523 9 20 9.44771 20 10C20 10.5523 19.5523 11 19 11H16C15.4477 11 15 10.5523 15 10ZM6.45708 13.5429C6.84761 13.9334 6.84761 14.5666 6.45708 14.9571L4.30708 17.1071C3.91656 17.4976 3.28339 17.4976 2.89287 17.1071C2.50234 16.7166 2.50234 16.0834 2.89287 15.6929L5.04287 13.5429C5.43339 13.1524 6.06656 13.1524 6.45708 13.5429ZM13.5429 13.5429C13.9334 13.1524 14.5666 13.1524 14.9571 13.5429L17.1071 15.6929C17.4976 16.0834 17.4976 16.7166 17.1071 17.1071C16.7166 17.4976 16.0834 17.4976 15.6929 17.1071L13.5429 14.9571C13.1524 14.5666 13.1524 13.9334 13.5429 13.5429ZM10 15C10.5523 15 11 15.4477 11 16V19C11 19.5523 10.5523 20 10 20C9.44771 20 9 19.5523 9 19V16C9 15.4477 9.44771 15 10 15Z'
          fill='white'
        />
      </svg>
    </Box>
  );
});

export default SunburstLoader;
