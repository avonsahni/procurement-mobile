import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import ProjectListScreen from './src/screens/ProjectListScreen';
import PackageListScreen from './src/screens/PackageListScreen';
import PackageDashboardScreen from './src/screens/PackageDashboardScreen';
import InvoiceFormScreen from './src/screens/InvoiceFormScreen';
import CashInflowFormScreen from './src/screens/CashInflowFormScreen';
import CashOutflowFormScreen from './src/screens/CashOutflowFormScreen';
import MilestoneFormScreen from './src/screens/MilestoneFormScreen';

export type RootStackParamList = {
  Login: undefined;
  ProjectList: undefined;
  PackageList: { projectId: string; projectName: string };
  PackageDashboard: { packageId: string; packageName: string };
  InvoiceForm: { packageId: string; currency: string; userName: string };
  CashInflowForm: { packageId: string; currency: string; userName: string };
  CashOutflowForm: { packageId: string; currency: string; userName: string };
  MilestoneForm: { packageId: string; orgId: string; userName: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const HEADER = {
  headerStyle: { backgroundColor: '#1e3a5f' },
  headerTintColor: '#ffffff',
  headerTitleStyle: { fontWeight: '600' as const, fontSize: 17 },
  headerBackTitleVisible: false,
};

function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9' }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={HEADER}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        ) : (
          <>
            <Stack.Screen name="ProjectList"      component={ProjectListScreen}      options={{ title: 'Projects' }} />
            <Stack.Screen name="PackageList"      component={PackageListScreen}      options={({ route }) => ({ title: route.params.projectName })} />
            <Stack.Screen name="PackageDashboard" component={PackageDashboardScreen} options={({ route }) => ({ title: route.params.packageName })} />
            <Stack.Screen name="InvoiceForm"      component={InvoiceFormScreen}      options={{ title: 'Add Invoice' }} />
            <Stack.Screen name="CashInflowForm"   component={CashInflowFormScreen}   options={{ title: 'Add Cash Inflow' }} />
            <Stack.Screen name="CashOutflowForm"  component={CashOutflowFormScreen}  options={{ title: 'Add Cash Outflow' }} />
            <Stack.Screen name="MilestoneForm"    component={MilestoneFormScreen}    options={{ title: 'Add Milestone Task' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <AppNavigator />
    </AuthProvider>
  );
}
