import { Navigation } from 'react-native-navigation';
import { registerScreens } from './src/navigation/NativeScreens';
import { startNavigation } from './src/navigation/router';

registerScreens();
Navigation.events().registerAppLaunchedListener(startNavigation);
