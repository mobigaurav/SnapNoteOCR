import React, { useEffect } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { store } from './src/app/store';
import RootNavigator from './src/navigation/RootNavigator';
import { theme } from './src/core/ui/theme';
import { initDb } from './src/core/db/schema';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import RNBootSplash from "react-native-bootsplash";

export default function App() {
  useEffect(() => {
    // Initialize schema/migrations at startup
    initDb().catch((e) => {
      // eslint-disable-next-line no-console
      console.error('DB init failed:', e);
    });
    RNBootSplash.hide({ fade: true });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ReduxProvider store={store}>
        <PaperProvider
        theme={theme}
        settings={{
          icon: (props) => <MaterialCommunityIcons {...props} />,
        }}
      >
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </PaperProvider>
      </ReduxProvider>
    </GestureHandlerRootView>
  );
}
