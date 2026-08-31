/**
 * Generic modal dialog, used for the flows that must not lose the context
 * behind them.
 */
import { useEffect, useRef, type MouseEvent, type ReactNode } from 'react'
import styles from './Modal.module.css'

/**
 * Elements that can take focus inside the dialog, matched in DOM order.
 *
 * Deliberately excludes `tabindex="-1"`, which is what the dialog container
 * itself carries: it is focusable on open but must not be a stop in the tab
 * cycle.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

interface ModalProps {
  /** Dialog heading, also used as its accessible name. */
  title: string
  /** Called on Escape, on the close button and on a backdrop press. */
  onClose: () => void
  /** Body of the dialog. */
  children: ReactNode
  /** Contents of the bottom action bar, usually a pair of buttons. */
  footer?: ReactNode
}

/**
 * Renders a centered dialog over a dimming backdrop, keeping keyboard focus
 * inside it for as long as it is open.
 *
 * Managing a single deadline happens in here rather than on a dedicated route
 * so the user stays on the vehicle they were looking at.
 */
export function Modal({ title, onClose, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Call sites pass an inline arrow, so `onClose` is a new function on every
  // render. Reaching it through a ref lets the effect below run once on mount:
  // re-running it would re-focus the dialog and fire its cleanup mid-use,
  // yanking focus back to the trigger while the user is still typing.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const dialog = dialogRef.current
    const previouslyFocused = document.activeElement as HTMLElement | null

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab' || !dialog) return

      // Wrap Tab around the dialog's own controls. Without this the user walks
      // out into the page behind, which stays rendered and interactive.
      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      )
      if (focusable.length === 0) {
        event.preventDefault()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement

      // Shift+Tab from the container counts as leaving backwards, because the
      // container is where focus sits immediately after opening.
      if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    dialog?.focus()

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      // Hand focus back to whatever opened the dialog, so closing it does not
      // drop keyboard users at the top of the document. The trigger may have
      // been unmounted in the meantime, hence the connection check.
      if (previouslyFocused?.isConnected) previouslyFocused.focus()
    }
  }, [])

  /**
   * Dismisses the dialog only when the press starts on the backdrop itself.
   *
   * Comparing `target` with `currentTarget` leaves clicks inside the dialog
   * alone without needing to stop their propagation, and reacting to mousedown
   * rather than click means a text selection that happens to end outside the
   * dialog does not close it.
   */
  function handleBackdropMouseDown(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose()
  }

  return (
    <div className={styles.overlay} onMouseDown={handleBackdropMouseDown}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // Not natively focusable, but focus has to land somewhere inside the
        // dialog when it opens.
        tabIndex={-1}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Chiudi"
          >
            ×
          </button>
        </header>

        <div className={styles.body}>{children}</div>

        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>
  )
}
