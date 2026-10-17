import './styles/theme.css';
import { startArt } from './art/background';
import { sound } from './drill/sound';
import { store } from './storage/store';
import { aboutView } from './ui/about';
import { cardView } from './ui/card';
import { chainView } from './ui/chain';
import { app } from './ui/context';
import { drillView } from './ui/drill';
import { homeView } from './ui/home';
import { mixedView } from './ui/mixed';
import { resultsView } from './ui/results';
import { startRouter } from './ui/router';

app.art = startArt(document.getElementById('art') as HTMLCanvasElement);

store.getPrefs().then((p) => {
  sound.muted = p.muted;
  startRouter(
    document.getElementById('app')!,
    {
      '': homeView,
      t: cardView,
      drill: drillView,
      mixed: mixedView,
      chain: chainView,
      results: resultsView,
      about: aboutView,
    },
    homeView,
  );
});
