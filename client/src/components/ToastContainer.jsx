import { useContext } from 'react';
import Notification from './Notification';
import { ToastContext } from './ToastContext';

function ToastContainer () {
  const context = useContext(ToastContext);
  if (!context) return null;

  const { toasts, removeToast } = context;

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        width: '335px',
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
