import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { useAuth } from '../auth/AuthContext';
import { ActiveChurchProvider } from '../church/ActiveChurchContext';
import { PushManager } from '../push/PushManager';
import { navigationRef } from './navigationRef';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ChurchHomeScreen from '../screens/ChurchHomeScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import MyChurchesScreen from '../screens/MyChurchesScreen';
import { colors } from '../theme';
import type { AppTabParamList, AuthStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const AppTabs = createBottomTabNavigator<AppTabParamList>();

function SignOutButton() {
  const { signOut } = useAuth();
  return (
    <Pressable onPress={signOut} hitSlop={8} style={styles.signOut}>
      <Text style={styles.signOutText}>Quitter</Text>
    </Pressable>
  );
}

const renderSignOut = () => <SignOutButton />;

function AppNavigator() {
  return (
    <ActiveChurchProvider>
      <PushManager />
      <AppTabs.Navigator
        screenOptions={{
          headerStyle: styles.header,
          headerTintColor: colors.white,
          headerTitleStyle: styles.headerTitle,
          headerRight: renderSignOut,
          tabBarActiveTintColor: colors.goldDark,
          tabBarInactiveTintColor: colors.faint,
        }}>
        <AppTabs.Screen name="Home" component={ChurchHomeScreen} options={{ title: 'Accueil' }} />
        <AppTabs.Screen name="Discover" component={DiscoverScreen} options={{ title: 'Découvrir' }} />
        <AppTabs.Screen name="MyChurches" component={MyChurchesScreen} options={{ title: 'Mes églises' }} />
      </AppTabs.Navigator>
    </ActiveChurchProvider>
  );
}

export default function RootNavigator() {
  const { loading, token } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.indigo} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {token ? (
        <AppNavigator />
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cream },
  header: { backgroundColor: colors.ink },
  headerTitle: { fontWeight: '700' },
  signOut: { paddingHorizontal: 12 },
  signOutText: { color: colors.gold, fontWeight: '700', fontSize: 14 },
});
