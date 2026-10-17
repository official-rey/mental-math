import { sound } from '../drill/sound';
import { MODES } from '../drill/types';
import { store, type KeypadPref } from '../storage/store';
import type { Level } from '../techniques/types';
import { app } from './context';
import { segmented } from './controls';
import { h, reveal } from './dom';
import type { View } from './router';
import { layout } from './shell';

function row(label: string, desc: string | null, control: HTMLElement): HTMLElement {
  return h(
    'div',
    { class: 'setting' },
    h('div', { class: 'setting-text' }, h('div', { class: 'setting-label' }, label), desc ? h('div', { class: 'setting-desc' }, desc) : null),
    control,
  );
}

const onOff = (name: string, value: boolean, set: (v: boolean) => void) =>
  segmented(name, [{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }], value ? 'on' : 'off', (v) => set(v === 'on'));

export async function settingsView(): Promise<View> {
  const p = await store.getPrefs();
  const status = h('span', { class: 'setting-desc', 'aria-live': 'polite' });

  const erase = h('button', { class: 'btn', type: 'button', 'data-testid': 'erase' }, 'Erase runs');
  erase.addEventListener('click', async () => {
    if (!confirm('Erase every run, personal best and leaderboard on this device? Settings stay.')) return;
    await store.clearRuns();
    status.textContent = 'Runs and bests erased.';
  });

  const content = reveal(
    h(
      'div',
      null,
      h('h1', { class: 'display' }, 'Settings'),
      h('h2', { class: 'section-head kicker' }, 'Drills'),
      row(
        'Starting level',
        'Used when you open a technique card.',
        segmented('Starting level', ([1, 2, 3] as Level[]).map((l) => ({ value: l, label: ['', 'I', 'II', 'III'][l] })), p.level, (level) => store.setPrefs({ level })),
      ),
      row(
        'Starting mode',
        null,
        segmented('Starting mode', MODES.map((m) => ({ value: m.id, label: m.short })), p.mode, (mode) => store.setPrefs({ mode })),
      ),
      row(
        'Number pad',
        'Auto shows the on-screen pad on touch screens.',
        segmented<KeypadPref>(
          'Number pad',
          [
            { value: 'auto', label: 'Auto' },
            { value: 'on', label: 'On' },
            { value: 'off', label: 'Off' },
          ],
          p.keypad,
          (keypad) => store.setPrefs({ keypad }),
        ),
      ),
      h('h2', { class: 'section-head kicker' }, 'Feedback'),
      row(
        'Sound',
        'Short tones for right, wrong and finish.',
        onOff('Sound', !p.muted, (on) => {
          sound.muted = !on;
          store.setPrefs({ muted: !on });
        }),
      ),
      row('Vibration', 'Taps on key presses and a buzz on a miss, where supported.', onOff('Vibration', p.haptics, (haptics) => store.setPrefs({ haptics }))),
      h('h2', { class: 'section-head kicker' }, 'Display'),
      row(
        'Math art',
        'The times-table plate on Train and drawings in wide-screen margins.',
        onOff('Math art', p.art, (art) => {
          store.setPrefs({ art });
          app.art?.setEnabled(art);
        }),
      ),
      h('h2', { class: 'section-head kicker' }, 'Data'),
      row('Runs and bests', 'Stored only on this device.', erase),
      status,
      h('h2', { class: 'section-head kicker' }, 'About'),
      h('p', { class: 'prose dim' }, 'Techniques adapted from A. T. Benjamin, The Secrets of Mental Math, and the Vedic mathematics tradition.'),
    ),
  );

  return { el: layout({ active: 'settings' }, content), title: 'Settings' };
}
