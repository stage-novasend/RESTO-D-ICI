import { X } from 'lucide-react';
import { SURFACE, BORDER, TEXT_DARK, TEXT_MUTED } from '../../theme/colors';

/* Fenêtre modale centrée avec overlay — remplace les modales réécrites partout.
   Ne rend rien si open=false. */
export default function Modal({ open, onClose, title, maxWidth = 640, children, footer }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 24,
        background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: SURFACE, borderRadius: 20, width: '100%', maxWidth,
          maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
        }}
      >
        {title && (
          <div
            className="flex items-center justify-between"
            style={{ padding: '20px 24px', borderBottom: `1px solid ${BORDER}` }}
          >
            <h3 className="text-base font-bold m-0" style={{ color: TEXT_DARK }}>{title}</h3>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: TEXT_MUTED }}
            >
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>
        )}
        <div style={{ padding: '20px 24px' }}>{children}</div>
        {footer && (
          <div
            className="flex justify-end gap-2.5"
            style={{ padding: '16px 24px', borderTop: `1px solid ${BORDER}` }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
