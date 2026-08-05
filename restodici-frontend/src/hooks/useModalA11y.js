import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Accessibilité minimale pour une modale : ferme sur Échap, piège le focus
 * à l'intérieur (Tab/Shift+Tab), focus le premier élément à l'ouverture, et
 * restaure le focus sur l'élément déclencheur à la fermeture.
 *
 * Aucune modale du projet (components/ui/Modal.jsx ni les modales
 * réécrites par page) n'avait ce comportement (audit ISO 25010 —
 * Utilisabilité §6).
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @returns {import('react').RefObject<HTMLElement>} ref à poser sur le conteneur de la modale
 */
export function useModalA11y(open, onClose) {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement;

    const container = containerRef.current;
    const focusables = container
      ? Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR))
      : [];
    (focusables[0] || container)?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab' || !container) return;
      const items = Array.from(
        container.querySelectorAll(FOCUSABLE_SELECTOR),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (triggerRef.current instanceof HTMLElement) {
        triggerRef.current.focus();
      }
    };
  }, [open, onClose]);

  return containerRef;
}
