import Api from '@/Api';
import { useToast } from '@/components/ToastContext';
import ScanCodeModal from '@/components/ScanCodeModal';

function ScanAdmitCodeModal ({ opened, onClose, onSuccess, _debugScanPhase }) {
  const { showToast } = useToast();

  function parseDeflectionId (text) {
    const urlMatch = text.match(/\/admit\/(\d+)/);
    if (urlMatch) return parseInt(urlMatch[1], 10);
    const numMatch = text.trim().match(/^\d+$/);
    if (numMatch) return parseInt(numMatch[0], 10);
    return null;
  }

  async function handleScan (text) {
    const deflectionId = parseDeflectionId(text);
    if (!deflectionId) {
      showToast('Invalid code. Please enter an admit code number or URL.', 'error');
      throw new Error('Invalid code');
    }

    try {
      await Api.deflections.admit(deflectionId);
      window.sessionStorage.setItem('careHighlightTarget', String(deflectionId));
      onSuccess?.();
      showToast('Subject admitted', 'success', 3000, 'Admit code confirmed.');
    } catch (err) {
      showToast(err._form || 'Failed to admit subject. Please try again.', 'error');
      throw err;
    }
  }

  return (
    <ScanCodeModal
      opened={opened}
      onClose={onClose}
      onScan={handleScan}
      prompt={'Point the camera at the person\'s transfer code to begin intake.'}
      manualEntryTitle='Enter Admit Code'
      loadingText='Admitting subject...'
      _debugScanPhase={_debugScanPhase}
    />
  );
}

export default ScanAdmitCodeModal;
