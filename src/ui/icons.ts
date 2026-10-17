const icon = (d: string) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;

export const ICONS = {
  back: icon('<path d="M15 5l-7 7 7 7"/>'),
  close: icon('<path d="M6 6l12 12M18 6L6 18"/>'),
  soundOn: icon('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  soundOff: icon('<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 5M22 9l-5 5"/>'),
  train: icon('<circle cx="12" cy="12" r="8.5"/><path d="M10 8.5l5 3.5-5 3.5z"/>'),
  learn: icon('<path d="M4 5.5C6.5 4.5 9.5 4.5 12 6c2.5-1.5 5.5-1.5 8-.5V19c-2.5-1-5.5-1-8 .5-2.5-1.5-5.5-1.5-8-.5z"/><path d="M12 6v13.5"/>'),
  stats: icon('<path d="M4 20h16"/><path d="M7 16v-5M12 16V6M17 16v-8"/>'),
  settings: icon('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
  pause: icon('<path d="M9 6v12M15 6v12"/>'),
  play: icon('<path d="M8 5.5l11 6.5-11 6.5z"/>'),
  skip: icon('<path d="M6 6l7 6-7 6zM16 6v12"/>'),
  hint: icon('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>'),
  backspace: icon('<path d="M9 5h11v14H9l-6-7z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>'),
  eye: icon('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.5"/>'),
};
