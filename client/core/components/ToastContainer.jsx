import { useContext } from 'react';
import Notification from './Notification';
import { ToastContext } from './ToastContext';

function ToastContainer () {
  const context = useContext(ToastContext);
  if (!context) return null;

  const { toasts } = context;

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
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
            variant={toast.variant}
            style={{
              width: '100%',
            }}
          />
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;

