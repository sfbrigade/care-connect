import { createTheme, Chip, Container } from '@mantine/core';

const AppTheme = createTheme({
  /** Your theme override here */
  cursorType: 'pointer',
  components: {
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
  }
});

export default AppTheme;
