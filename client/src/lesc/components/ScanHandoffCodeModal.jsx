import Api from '@/Api';
import { useToast } from '@/components/ToastContext';
import ScanCodeModal from '@/components/ScanCodeModal';

function ScanHandoffCodeModal ({ opened, onClose, onSuccess }) {
  const { showToast } = useToast();

  function parseDeflectionId (text) {
    const urlMatch = text.match(/\/handoff\/(\d+)/);
    if (urlMatch) return parseInt(urlMatch[1], 10);
    const numMatch = text.trim().match(/^\d+$/);
    if (numMatch) return parseInt(numMatch[0], 10);
    return null;
  }

  async function handleScan (text) {
    const deflectionId = parseDeflectionId(text);
    if (!deflectionId) {
      showToast('Invalid code. Please enter a handoff code number or URL.', 'error');
      throw new Error('Invalid code');
    }

    try {
      await Api.deflections.handoff(deflectionId);
      onSuccess?.();
      showToast('Hold received', 'success', 3000, 'Handoff code confirmed.');
    } catch (err) {
      showToast(err?._form || 'Failed to accept handoff. Please try again.', 'error');
      throw err;
    }
  }

  async function handleManualSubmitCodes (codes) {
    const results = [];

    for (const code of codes) {
      const deflectionId = parseDeflectionId(code);
      if (!deflectionId) {
        results.push({ code, error: 'Invalid code. Please enter a handoff code number or URL.' });
        continue;
      }

      try {
        await Api.deflections.handoff(deflectionId);
        results.push({ code, error: null });
      } catch (err) {
        results.push({ code, error: err?._form || 'Failed to accept handoff. Please try again.' });
      }
    }

    onSuccess?.();
    if (results.every((r) => !r.error)) {
      showToast(
        codes.length === 1 ? 'Hold received' : `${codes.length} holds received`,
        'success',
        3000,
        codes.length === 1 ? 'Handoff code confirmed.' : 'Handoff codes confirmed.'
      );
    }
    return results;
  }

  return (
    <ScanCodeModal
      opened={opened}
      onClose={onClose}
      onScan={handleScan}
      onManualSubmitCodes={handleManualSubmitCodes}
      prompt='Scan the QR code to accept the handoff.'
      manualEntryTitle='Enter Handoff Code'
      manualEntryLabel='Enter handoff code'
      manualEntryDescription="If the QR code doesn't work, ask the officer for the handoff code."
      manualEntryInputPlaceholder='Enter handoff code'
      manualEntryAddButtonLabel='+ Handoff code'
      manualEntryAllowMultiple
      loadingText='Accepting handoff...'
    />
  );
}

export default ScanHandoffCodeModal;
