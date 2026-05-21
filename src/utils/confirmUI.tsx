import React from 'react';
import toast from 'react-hot-toast';

export const confirmUI = (message: string, onConfirm: () => void) => {
  toast.custom(
    (t) => (
      <div className={`${t.visible ? 'animate-in fade-in zoom-in-95' : 'animate-out fade-out zoom-out-95'} max-w-sm w-full bg-[#1A1A1A] border border-[#333] shadow-2xl rounded-2xl pointer-events-auto flex flex-col p-5`}>
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-red-950/30 text-red-500 p-2 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
          <h3 className="text-white font-bold text-lg leading-tight">Atenção!</h3>
        </div>
        <p className="text-[#888] text-sm mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-2 justify-end w-full">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-1 py-2.5 bg-[#222] hover:bg-[#333] text-white text-xs uppercase tracking-widest font-bold rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              toast.dismiss(t.id);
              onConfirm();
            }}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs uppercase tracking-widest font-bold rounded-xl transition-colors shadow-[0_0_15px_rgba(220,38,38,0.3)]"
          >
            Confirmar
          </button>
        </div>
      </div>
    ),
    { duration: Infinity, position: 'top-center' }
  );
};
