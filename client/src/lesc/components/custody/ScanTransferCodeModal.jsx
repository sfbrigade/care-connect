import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { useToast } from '@/components/ToastContext';
import ScanCodeModal from '@/components/ScanCodeModal';
import { getTransferErrorMessage } from './scanTransferCodeModalUtils';

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
      showToast(getTransferErrorMessage(err), 'error');
      throw err;
    }
  }

  async function handleManualSubmitCodes (codes) {
    try {
      let lastDeflectionId = null;

      for (const code of codes) {
        const deflectionId = parseDeflectionId(code);
        if (!deflectionId) {
          showToast('Invalid code. Please enter a transfer code number or URL.', 'error');
          throw new Error('Invalid code');
        }

        await Api.deflections.transfer(deflectionId);
        lastDeflectionId = deflectionId;
      }

      if (lastDeflectionId) {
        window.sessionStorage.setItem('custodyHighlightTarget', String(lastDeflectionId));
      }
      onSuccess?.();
      showToast(
        codes.length === 1 ? 'Subject received' : `${codes.length} subjects received`,
        'success',
        3000,
        codes.length === 1 ? 'Transfer code confirmed.' : 'Transfer codes confirmed.'
      );
    } catch (err) {
      showToast(getTransferErrorMessage(err), 'error');
      throw err;
    }
  }

  return (
    <ScanCodeModal
      opened={opened}
      onClose={onClose}
      onScan={handleScan}
      onManualSubmitCodes={handleManualSubmitCodes}
      prompt={`Scan the subject's QR code to transfer custody to ${facility?.name || 'this facility'}.`}
      manualEntryTitle='Enter Transfer Code'
      manualEntryLabel='Enter transfer code'
      manualEntryDescription='If the QR code doesn’t work, ask the officer for the 6-digit transfer code.'
      manualEntryInputPlaceholder='Enter a 6-digit code'
      manualEntryAddButtonLabel='+ Transfer code'
      manualEntryAllowMultiple
      loadingText='Transferring subject into custody...'
      _debugScanPhase={_debugScanPhase}
    />
  );
}

export default ScanTransferCodeModal;
