import './styles/theme.css';
import { startArt } from './art/background';
import { sound } from './drill/sound';
import { store } from './storage/store';
import { aboutView } from './ui/about';
import { cardView } from './ui/card';
import { app } from './ui/context';
import { homeView } from './ui/home';
import { startRouter } from './ui/router';

app.art = startArt(document.getElementById('art') as HTMLCanvasElement);

store.getPrefs().then((p) => {
  sound.muted = p.muted;
  startRouter(
    document.getElementById('app')!,
    {
      '': homeView,
      t: cardView,
      about: aboutView,
    },
    homeView,
  );
});
