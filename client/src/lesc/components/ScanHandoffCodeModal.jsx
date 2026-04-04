import Api from '@/Api';
import { useToast } from '@/components/ToastContext';
import ScanCodeModal from '@/components/ScanCodeModal';
import { getHandoffErrorMessage } from './scanHandoffCodeModalUtils';

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
      showToast(getHandoffErrorMessage(err), 'error');
      throw err;
    }
  }

  async function handleManualSubmitCodes (codes) {
    try {
      for (const code of codes) {
        const deflectionId = parseDeflectionId(code);
        if (!deflectionId) {
          showToast('Invalid code. Please enter a handoff code number or URL.', 'error');
          throw new Error('Invalid code');
        }

        await Api.deflections.handoff(deflectionId);
      }

      onSuccess?.();
      showToast(
        codes.length === 1 ? 'Hold received' : `${codes.length} holds received`,
        'success',
        3000,
        codes.length === 1 ? 'Handoff code confirmed.' : 'Handoff codes confirmed.'
      );
    } catch (err) {
      showToast(getHandoffErrorMessage(err), 'error');
      throw err;
    }
  }

  return (
    <ScanCodeModal
      opened={opened}
      onClose={onClose}
      onScan={handleScan}
      onManualSubmitCodes={handleManualSubmitCodes}
      prompt='Scan the QR code shown by the arresting officer to accept the handoff.'
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
