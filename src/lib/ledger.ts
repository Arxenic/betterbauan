/**
 * The homepage "open ledger": four gaps, one interactive panel.
 *
 * This is deliberately not a carousel. There is no autoplay and no swipe
 * gesture competing with the page scroll. A reader selects a gap from a
 * vertical index; the detail panel changes, the gold rail moves, and the panel
 * takes a small pointer-driven tilt. Keyboard arrows work as expected.
 */
export function initLedger() {
  const root = document.querySelector<HTMLElement>('[data-ledger]');
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-ledger-item]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-ledger-panel]'));
  const panelHost = root.querySelector<HTMLElement>('.ledger-panels');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!tabs.length || !panels.length) return;

  const activate = (id: string, focus = false) => {
    const index = tabs.findIndex((tab) => tab.dataset.ledgerItem === id);
    if (index < 0) return;

    for (const tab of tabs) {
      const active = tab.dataset.ledgerItem === id;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    }

    for (const panel of panels) {
      const active = panel.dataset.ledgerPanel === id;
      panel.hidden = !active;
      if (active) {
        panel.classList.remove('is-entering');
        if (!reduce) {
          // Force a reflow so the short entry animation replays.
          void panel.offsetWidth;
          panel.classList.add('is-entering');
        }
      }
    }

    root.style.setProperty('--ledger-i', String(index));
    if (focus) tabs[index]?.focus();
  };

  for (const tab of tabs) {
    tab.addEventListener('click', () => activate(tab.dataset.ledgerItem ?? ''));

    tab.addEventListener('keydown', (event) => {
      const current = tabs.indexOf(tab);
      let next = current;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (current + 1) % tabs.length;
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (current - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;

      event.preventDefault();
      activate(tabs[next].dataset.ledgerItem ?? '', true);
    });
  }

  // A small pointer tilt. It is decoration, not information: nothing is hidden
  // behind it, and it disappears under reduced-motion or a coarse pointer.
  if (panelHost && !reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    panelHost.addEventListener('pointermove', (event) => {
      const rect = panelHost.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
      panelHost.style.setProperty('--tilt-x', `${(-y * 1.1).toFixed(2)}deg`);
      panelHost.style.setProperty('--tilt-y', `${(x * 1.1).toFixed(2)}deg`);
    });

    panelHost.addEventListener('pointerleave', () => {
      panelHost.style.setProperty('--tilt-x', '0deg');
      panelHost.style.setProperty('--tilt-y', '0deg');
    });
  }

  // The section is useful before JS runs: the first panel is rendered open and
  // every other panel is hidden in the markup.
  root.style.setProperty('--ledger-i', '0');
}
