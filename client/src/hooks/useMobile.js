import { useMediaQuery } from '@mantine/hooks';

/**
 * Hook to detect if the current viewport is mobile-sized
 * Returns true if screen width is less than Mantine's 'sm' breakpoint (48em / 768px)
 * @returns {boolean} True if mobile, false otherwise
 */
export function useMobile () {
  return useMediaQuery('(max-width: 48em)');
}
