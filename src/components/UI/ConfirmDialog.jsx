import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ConfirmContext = createContext(null);

function WarningTriangle() {
  return (
    <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.834-1.962-.834-2.732 0L4.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  );
}

function InfoCircle() {
  return (
    <svg className="w-6 h-6 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(({ title, message, danger = false, confirmLabel = 'Confirmer', cancelLabel = 'Annuler' }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ title, message, danger, confirmLabel, cancelLabel });
    });
  }, []);

  const handleConfirm = () => {
    resolveRef.current?.(true);
    setDialog(null);
  };

  const handleCancel = () => {
    resolveRef.current?.(false);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={handleCancel}
          />
          {/* Dialog */}
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200 animate-scale-in">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="shrink-0 mt-0.5">
                  {dialog.danger ? <WarningTriangle /> : <InfoCircle />}
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-slate-800 mb-1">{dialog.title}</h3>
                  {dialog.message && (
                    <p className="text-sm text-slate-500 leading-relaxed">{dialog.message}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex items-center justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {dialog.cancelLabel}
              </button>
              <button
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  dialog.danger
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}

export default ConfirmProvider;
