import './styles/theme.css';
import './styles/app.css';
import { startArt } from './art/background';
import { sound } from './drill/sound';
import { store } from './storage/store';
import { aboutView } from './ui/about';
import { cardView } from './ui/card';
import { chainView } from './ui/chain';
import { app } from './ui/context';
import { drillView } from './ui/drill';
import { learnView } from './ui/learn';
import { mixedView } from './ui/mixed';
import { resultsView } from './ui/results';
import { settingsView } from './ui/settings';
import { statsView } from './ui/stats';
import { trainView } from './ui/train';
import { startRouter } from './ui/router';

app.art = startArt(document.getElementById('art') as HTMLCanvasElement);

store.getPrefs().then((p) => {
  sound.muted = p.muted;
  app.art?.setEnabled(p.art);
  startRouter(
    document.getElementById('app')!,
    {
      '': trainView,
      learn: learnView,
      stats: statsView,
      settings: settingsView,
      t: cardView,
      drill: drillView,
      mixed: mixedView,
      chain: chainView,
      results: resultsView,
      about: aboutView,
    },
    trainView,
  );
});
