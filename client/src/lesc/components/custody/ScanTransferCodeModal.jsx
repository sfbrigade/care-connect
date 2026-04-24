import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import ScanCodeModal from '@/components/ScanCodeModal';
import { useToast } from '@/components/ToastContext';
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
      throw new Error('Invalid code');
    }

    await Api.deflections.transfer(deflectionId);
    window.sessionStorage.setItem('custodyHighlightTarget', String(deflectionId));
    onSuccess?.();
  }

  async function handleManualSubmitCodes (codes) {
    let lastDeflectionId = null;
    const transferResults = [];

    for (const code of codes) {
      const deflectionId = parseDeflectionId(code);
      if (!deflectionId) {
        transferResults.push({ code, error: 'Invalid code' });
        continue;
      }
      try {
        await Api.deflections.transfer(deflectionId);
        lastDeflectionId = deflectionId;
        transferResults.push({ code, error: null });
      } catch (err) {
        transferResults.push({ code, error: err?._form ?? err?.message ?? 'Something went wrong' });
      }
    }

    if (lastDeflectionId) {
      window.sessionStorage.setItem('custodyHighlightTarget', String(lastDeflectionId));
      onSuccess?.();
    }
    if (transferResults.every((r) => !r.error)) {
      showToast(
        'Person received',
        'success',
        3000,
        'Transfer code confirmed.'
      );
    }
    return transferResults;
  }

  return (
    <ScanCodeModal
      opened={opened}
      onClose={onClose}
      onScan={handleScan}
      onManualSubmitCodes={handleManualSubmitCodes}
      prompt={`Scan the person's QR code to transfer custody to ${facility?.name || 'this facility'}.`}
      manualEntryTitle='Enter Transfer Code'
      manualEntryLabel='Enter transfer code'
      manualEntryDescription="If the QR code doesn't work, ask the officer for the transfer code."
      manualEntryInputPlaceholder='Enter transfer code'
      manualEntryAddButtonLabel='+ Transfer code'
      manualEntryAllowMultiple
      loadingText='Transferring person into custody...'
      _debugScanPhase={_debugScanPhase}
    />
  );
}

export default ScanTransferCodeModal;
