import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { useToast } from '@/components/ToastContext';
import ScanCodeModal from '@/components/ScanCodeModal';

function ScanTransferCodeModal ({ opened, onClose, onSuccess, _debugScanPhase }) {
  const { facility } = useFacilityContext();
  const { showToast } = useToast();

  function parseDeflectionId (text) {
    const urlMatch = text.match(/\/transfer\/(\d+)/);
    if (urlMatch) return parseInt(urlMatch[1], 10);
    const numMatch = text.trim().match(/^\d+$/);
    if (numMatch) return parseInt(numMatch[0], 10);
    return null;
  }

  async function handleScan (text) {
    const deflectionId = parseDeflectionId(text);
    if (!deflectionId) {
      showToast('Invalid code. Please enter a transfer code number or URL.', 'error');
      throw new Error('Invalid code');
    }

    try {
      await Api.deflections.transfer(deflectionId);
      window.sessionStorage.setItem('custodyHighlightTarget', String(deflectionId));
      onSuccess?.();
      showToast('Subject received', 'success', 3000, 'Transfer code confirmed.');
    } catch (err) {
      showToast(err._form || 'Failed to transfer subject into custody. Please try again.', 'error');
      throw err;
    }
  }

  return (
    <ScanCodeModal
      opened={opened}
      onClose={onClose}
      onScan={handleScan}
      prompt={`Scan the subject's QR code to transfer custody to ${facility?.name || 'this facility'}.`}
      manualEntryTitle='Enter Transfer Code'
      loadingText='Transferring subject into custody...'
      _debugScanPhase={_debugScanPhase}
    />
  );
}

export default ScanTransferCodeModal;
