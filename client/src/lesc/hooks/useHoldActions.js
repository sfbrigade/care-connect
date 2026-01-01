import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useDisclosure } from '@mantine/hooks';
import Api from '@/Api';
import { useToast } from '@/components/ToastContext';

/**
 * Custom hook for managing hold actions (cancel, extend, transfer)
 * @param {Object} options - Configuration options
 * @param {string|string[]} options.invalidateQueries - Query keys to invalidate on success
 * @param {Function} options.onCancelSuccess - Optional callback after cancel success
 * @returns {Object} Hold action handlers and state
 */
export function useHoldActions ({ invalidateQueries = [], onCancelSuccess } = {}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [cancelModalOpened, { open: openCancelModal, close: closeCancelModal }] = useDisclosure(false);
  const [qrModalOpened, { open: openQRModal, close: closeQRModal }] = useDisclosure(false);
  const [selectedHold, setSelectedHold] = useState(null);

  // Normalize invalidateQueries to always be an array of query keys
  // Each query key can be a string or an array (for parameterized queries)
  // Examples:
  //   ['lesc-holds', facilityId] -> [['lesc-holds', facilityId]] (single parameterized query key)
  //   [['lesc-holds', facilityId], ['other-query']] -> [['lesc-holds', facilityId], ['other-query']] (multiple query keys)
  //   'lesc-holds' -> ['lesc-holds'] (single string query key)
  const queryKeysToInvalidate = (() => {
    if (!invalidateQueries) return [];
    // If it's already an array
    if (Array.isArray(invalidateQueries)) {
      // If first element is an array, treat as array of query keys (already normalized)
      if (invalidateQueries.length > 0 && Array.isArray(invalidateQueries[0])) {
        return invalidateQueries;
      }
      // If it's a flat array, treat as single parameterized query key
      // This handles cases like ['admin-facility-holds', id]
      return [invalidateQueries];
    }
    // Single query key (string)
    return [invalidateQueries];
  })();

  const cancelMutation = useMutation({
    mutationFn: (holdId) => Api.lesc.holds.cancel(holdId),
    onSuccess: () => {
      queryKeysToInvalidate.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
      closeCancelModal();
      setSelectedHold(null);
      showToast('Hold canceled successfully', 'success');
      onCancelSuccess?.();
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || 'Failed to cancel hold';
      showToast(errorMessage, 'error');
    },
  });

  const extendMutation = useMutation({
    mutationFn: (holdId) => Api.holds.extend([holdId]),
    onSuccess: () => {
      queryKeysToInvalidate.forEach(key => {
        queryClient.invalidateQueries({ queryKey: key });
      });
      queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
      showToast('Hold extended by 30 minutes', 'success');
    },
    onError: (error) => {
      const errorMessage = error.response?.data?.error || 'Failed to extend hold';
      showToast(errorMessage, 'error');
    },
  });

  const handleCancel = (hold) => {
    if (!hold || !hold.id) {
      console.error('Hold or hold.id is missing:', hold);
      showToast('Unable to cancel hold: missing hold information', 'error');
      return;
    }
    setSelectedHold(hold);
    openCancelModal();
  };

  const handleConfirmCancel = () => {
    if (selectedHold?.id) {
      cancelMutation.mutate(selectedHold.id);
    } else {
      showToast('Hold ID is missing. Please try again.', 'error');
      closeCancelModal();
      setSelectedHold(null);
    }
  };

  const handleTransfer = (hold) => {
    if (!hold || !hold.id) {
      console.error('Hold or hold.id is missing:', hold);
      return;
    }
    setSelectedHold(hold);
    openQRModal();
  };

  const handleExtend = (holdId) => {
    if (!holdId) {
      console.error('Hold ID is missing');
      return;
    }
    extendMutation.mutate(holdId);
  };

  const handleCloseQRModal = () => {
    const holdIdToCancel = selectedHold?.id;
    if (holdIdToCancel) {
      queryClient.cancelQueries({ queryKey: ['hold-transfer-status', holdIdToCancel] });
    }
    closeQRModal();
    setSelectedHold(null);
  };

  const handleQRDone = () => {
    queryKeysToInvalidate.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
    queryClient.invalidateQueries({ queryKey: ['lesc-availability'] });
  };

  const handleCloseCancelModal = () => {
    closeCancelModal();
    setSelectedHold(null);
  };

  return {
    // State
    cancelModalOpened,
    qrModalOpened,
    selectedHold,

    // Handlers
    handleCancel,
    handleConfirmCancel,
    handleTransfer,
    handleExtend,
    handleCloseQRModal,
    handleQRDone,
    handleCloseCancelModal,

    // Modal controls
    openCancelModal,
    closeCancelModal,
    openQRModal,
    closeQRModal,

    // Mutations (for loading states)
    cancelMutation,
    extendMutation,
  };
}
