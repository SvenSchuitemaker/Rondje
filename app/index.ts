import { registerRootComponent } from 'expo';

// De achtergrondtaak moet gedefinieerd zijn voordat de app rendert,
// ook als iOS de app op de achtergrond start voor een locatie-update.
import './src/tracking/runTracker';
import App from './App';

registerRootComponent(App);
