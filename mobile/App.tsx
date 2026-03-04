import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#131312',
    card: '#131312',
    text: '#f0ede3',
    border: '#2e2e2b',
    primary: '#c4622d',
  },
};
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { DrawerLayout } from '@/components/AppDrawer';
import LoginScreen from '@/screens/LoginScreen';
import SubscriptionWallScreen from '@/screens/SubscriptionWallScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import OrdersScreen from '@/screens/OrdersScreen';
import ProductsScreen from '@/screens/ProductsScreen';
import CustomersScreen from '@/screens/CustomersScreen';
import LedgerScreen from '@/screens/LedgerScreen';
import ChatScreen from '@/screens/ChatScreen';

const Stack = createNativeStackNavigator();

const SCREENS: Record<string, React.ComponentType<any>> = {
  Dashboard: DashboardScreen,
  Orders: OrdersScreen,
  Products: ProductsScreen,
  Customers: CustomersScreen,
  Ledger: LedgerScreen,
  Chat: ChatScreen,
};

function MainApp() {
  return <DrawerLayout screens={SCREENS} initialScreen="Dashboard" />;
}

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : user.subscriptionActive ? (
        <Stack.Screen name="Main" component={MainApp} />
      ) : (
        <Stack.Screen name="SubscriptionWall" component={SubscriptionWallScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <View style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer theme={DarkTheme}>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#131312',
  },
  loading: {
    flex: 1,
    backgroundColor: '#131312',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
