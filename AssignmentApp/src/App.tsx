// src/App.tsx
import 'react-native-url-polyfill/auto';
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WishlistScreen from './screens/WishlistScreen';
import AddScreen from './screens/AddScreen';
import { initAndMigrate } from './utils/storage';
import { Linking, Platform } from 'react-native';

export type RootStackParamList = {
  Wishlist: undefined;
  Add: { url?: string } | undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    const handleUrl = (event: { url: string }) => {
      const link = event.url;
      // handle link if needed
    };

    const subscription = Linking.addEventListener('url', handleUrl);

    return () => {
      subscription.remove();
    };
  }, []);

  // Simple linking config so OS-level links open the Add screen automatically
  const linking = {
    prefixes: ['centscape://'],
    config: {
      screens: {
        Add: {
          path: 'add',
          parse: {
            // we will parse 'url' query param manually in AddScreen
          },
        },
      },
    },
  };

  return (
    <NavigationContainer linking={linking} fallback={<></>}>
      <Stack.Navigator initialRouteName="Wishlist">
        <Stack.Screen name="Wishlist" component={WishlistScreen} />
        <Stack.Screen
          name="Add"
          component={AddScreen}
          options={{ title: 'Add to wishlist' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
