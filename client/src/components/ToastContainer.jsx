import { useContext } from 'react';
import Notification from './Notification';
import { ToastContext } from './ToastContext';
import { useMobile } from '../hooks/useMobile';

function ToastContainer () {
  const context = useContext(ToastContext);
  if (!context) return null;

  const { toasts, removeToast } = context;
  const isMobile = useMobile();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        ...(isMobile
          ? {
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(90vw, 400px)',
            }
          : {
              right: '16px',
              width: '400px',
            }),
        zIndex: 10000,
        pointerEvents: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            pointerEvents: 'auto',
            animation: 'slideDown 0.3s ease-out',
          }}
        >
          <Notification
            message={toast.message}
            messageSecondary={toast.messageSecondary}
            variant={toast.variant}
            style={{
              width: '100%',
            }}
            onDismiss={() => {
              removeToast(toast.id);
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
