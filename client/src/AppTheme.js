import { createTheme, Accordion, Alert, Burger, Checkbox, Chip, Container, Button, Card, Badge, Input, Modal, SegmentedControl, Stack, Select, Textarea, TextInput } from '@mantine/core';

import accordionClasses from './components/Accordian.module.css';
import buttonClasses from './components/Button.module.css';
import chipClasses from './components/Chip.module.css';
import inputClasses from './components/Input.module.css';

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

  headings: {
    fontWeight: 'regular',
    sizes: {
      h2: {
        fontSize: '32px',
        lineHeight: '40px',
      },
      h3: {
        fontSize: '24px',
        lineHeight: '32px',
      },
      h4: {
        fontSize: '20px',
        lineHeight: '24px',
      },
    }
  },

  components: {
    Accordion: Accordion.extend({
      defaultProps: {
        chevronIconSize: 20,
      },
      classNames: accordionClasses,
    }),
    Alert: Alert.extend({
      styles: {
        icon: {
          position: 'relative',
          top: '2px',
        },
        title: {
          fontSize: '16px',
          fontWeight: 'normal',
        },
      },
    }),
    Badge: Badge.extend({
      defaultProps: {
        radius: 'xl', // 24px border radius
      },
    }),
    Burger: Burger.extend({
      defaultProps: {
        size: 'sm',
        lineSize: 2,
        bg: 'rgb(from var(--mantine-color-gray-6) R G B / 0.1)',
        bdrs: '50%',
        px: '12px',
        w: '44px',
        h: '44px',
      },
    }),
    Button: Button.extend({
      defaultProps: {
        color: 'indigo.6',
        size: 'lg',
        radius: 'xl', // 24px border radius
      },
      classNames: buttonClasses
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
    Checkbox: Checkbox.extend({
      defaultProps: {
        size: 'lg',
        radius: 'md',
      },
      classNames: inputClasses
    }),
    Chip: Chip.extend({
      defaultProps: {
        color: 'black',
        size: 'xl',
      },
      classNames: chipClasses
    }),
    Container: Container.extend({
      defaultProps: {
        size: 'xs',
        px: 'xl'
      }
    }),
    InputWrapper: Input.Wrapper.extend({
      defaultProps: {
        size: 'lg',
      },
      classNames: inputClasses
    }),
    Modal: Modal.extend({
      defaultProps: {
        padding: 'xl',
        radius: 'lg'
      }
    }),
    SegmentedControl: SegmentedControl.extend({
      defaultProps: {
        size: 'lg',
        radius: 'xl'
      }
    }),
    Select: Select.extend({
      defaultProps: {
        size: 'lg',
        radius: 'md'
      },
      classNames: inputClasses
    }),
    Stack: Stack.extend({
      defaultProps: {
        gap: 'xl'
      }
    }),
    Textarea: Textarea.extend({
      defaultProps: {
        size: 'lg',
        radius: 'md'
      },
      classNames: inputClasses
    }),
    TextInput: TextInput.extend({
      defaultProps: {
        size: 'lg',
        radius: 'md'
      },
      classNames: inputClasses
    }),
  }
});

export default AppTheme;
