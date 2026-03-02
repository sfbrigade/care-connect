import Api from '@/Api';
import { useFacilityContext } from '@/FacilityContext';
import { useToast } from '@/components/ToastContext';
import ScanCodeModal from '@/components/ScanCodeModal';

function ScanAdmitCodeModal ({ opened, onClose, onSuccess, _debugScanPhase }) {
  const { facility } = useFacilityContext();
  const { showToast } = useToast();

  function parseDeflectionId (text) {
    const urlMatch = text.match(/\/(transfer|admit)\/(\d+)/);
    if (urlMatch) return parseInt(urlMatch[2], 10);
    const numMatch = text.trim().match(/^\d+$/);
    if (numMatch) return parseInt(numMatch[0], 10);
    return null;
  }

  async function handleScan (text) {
    const deflectionId = parseDeflectionId(text);
    if (!deflectionId) {
      showToast('Transfer code not recognized', 'error', 4000, 'Check the code and try again.');
      throw new Error('Invalid code');
    }

    try {
      const response = await Api.deflections.admit(deflectionId);
      const data = response?.data ?? {};
      const admittedCount = Number(
        data.admittedCount ??
        data.count ??
        (Array.isArray(data.subjects) ? data.subjects.length : 1)
      );
      const name = [data?.subject?.firstName, data?.subject?.lastName].filter(Boolean).join(' ');

      window.sessionStorage.setItem('careHighlightTarget', String(deflectionId));
      onSuccess?.();

      if (admittedCount > 1) {
        showToast(
          `Intake started for ${admittedCount} persons`,
          'success',
          4000,
          'These persons are now in medical intake. Continue the assessments.'
        );
      } else {
        showToast(
          'Intake started',
          'success',
          4000,
          `${name || 'This person'} is now in medical intake. Continue the assessment.`
        );
      }
    } catch (err) {
      const status = err?.response?.status;
      const message = err?.message ?? err?._form ?? '';
      const isNetworkError = !status || message.toLowerCase().includes('network');

      if (status === 409) {
        showToast(
          'Intake already started',
          'warning',
          4000,
          'This person is already in medical intake. Please check chair status.'
        );
      } else if (isNetworkError) {
        showToast(
          'Connection problem',
          'warning',
          4000,
          'We couldn\'t start intake. Check your connection and try again.'
        );
      } else {
        showToast(
          'Transfer code not recognized',
          'error',
          4000,
          'Check the code and try again.'
        );
      }
      throw err;
    }
  }

  return (
    <ScanCodeModal
      opened={opened}
      onClose={onClose}
      onScan={handleScan}
      prompt={`Scan the person's QR code to transfer custody to ${facility?.name || 'this facility'}.`}
      manualEntryTitle='Enter Transfer Code'
      loadingText='Transferring person into custody...'
      _debugScanPhase={_debugScanPhase}
    />
  );
}

export default ScanAdmitCodeModal;
