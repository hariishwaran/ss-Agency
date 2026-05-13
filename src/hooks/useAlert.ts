import { useState, useCallback } from 'react';

interface AlertOptions {
  title: string;
  message: string;
  buttonLabel?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
}

export function useAlert() {
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    options: AlertOptions;
    resolve: () => void;
  } | null>(null);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setAlertState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const onClose = useCallback(() => {
    if (alertState) {
      alertState.resolve();
      setAlertState(null);
    }
  }, [alertState]);

  return {
    alert,
    alertProps: {
      isOpen: !!alertState?.isOpen,
      title: alertState?.options.title || '',
      message: alertState?.options.message || '',
      confirmLabel: alertState?.options.buttonLabel || 'OK',
      cancelLabel: '', // Hide cancel button
      variant: alertState?.options.variant,
      onConfirm: onClose,
      onCancel: onClose,
    },
  };
}
