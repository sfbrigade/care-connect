import { createTheme, Chip, Container, Button, Card, Badge, SegmentedControl, TextInput } from '@mantine/core';

const AppTheme = createTheme({
  /** Your theme override here */
  cursorType: 'pointer',

  // Font family - Roboto
  fontFamily: 'Roboto, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',

  // Note: Custom colors are defined in component styles, not in theme colors
  // Mantine requires colors to be arrays of 10 shades

  // Spacing scale from Figma (4px, 8px, 12px, 16px, 20px, 24px)
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
  },

  // Border radius from Figma
  radius: {
    md: '8px',
    lg: '16px',
    xl: '24px',
  },

  // Typography scale
  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
  },

  // Line heights
  lineHeights: {
    xs: '16px',
    sm: '20px',
    md: '24px',
    lg: '28px',
    xl: '32px',
  },

  components: {
    Badge: Badge.extend({
      defaultProps: {
        radius: 'xl', // 24px border radius
      },
    }),
    Button: Button.extend({
      defaultProps: {
        size: 'lg',
        radius: 'xl', // 24px border radius
      },
    }),
    Card: Card.extend({
      defaultProps: {
        radius: 'lg', // 16px border radius
        padding: 'lg', // 16px padding
      },
      styles: {
        root: {
          backgroundColor: '#f8f9fa',
        },
      },
    }),
    Chip: Chip.extend({
      defaultProps: {
        color: 'black',
      }
    }),
    Container: Container.extend({
      defaultProps: {
        size: 'xl'
      }
    }),
    SegmentedControl: SegmentedControl.extend({
      defaultProps: {
        size: 'md',
        radius: 'lg'
      }
    }),
    TextInput: TextInput.extend({
      defaultProps: {
        size: 'lg',
        radius: 'md'
      },
    }),
  }
});

export default AppTheme;
