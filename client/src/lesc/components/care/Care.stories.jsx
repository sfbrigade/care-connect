import { fn } from 'storybook/test';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createHead, UnheadProvider } from '@unhead/react/client';
import { facilityContext } from '@/FacilityContext';
import { ToastProvider } from '@/components/ToastContext';
import Care from './Care';

const mockFacility = { id: 1, name: 'RESET' };
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
const head = createHead();

export default {
  title: 'LESC/Care/Care',
  component: Care,
  parameters: { layout: 'fullscreen' },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <UnheadProvider head={head}>
        <QueryClientProvider client={queryClient}>
          <facilityContext.Provider value={{ facility: mockFacility, setFacility: fn() }}>
            <ToastProvider>
              <Story />
            </ToastProvider>
          </facilityContext.Provider>
        </QueryClientProvider>
      </UnheadProvider>
    ),
  ],
};

export const Default = {};
