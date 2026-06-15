import React from 'react';
import { registerRootComponent } from 'expo';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ProjectProvider, useProject } from './src/context/ProjectContext';
import LoginScreen from './src/screens/LoginScreen';
import ProjectListScreen from './src/screens/ProjectListScreen';
import PackageListScreen from './src/screens/PackageListScreen';
import PackageDashboardScreen from './src/screens/PackageDashboardScreen';
import InvoiceFormScreen from './src/screens/InvoiceFormScreen';
import CashInflowFormScreen from './src/screens/CashInflowFormScreen';
import CashOutflowFormScreen from './src/screens/CashOutflowFormScreen';
import MilestoneFormScreen from './src/screens/MilestoneFormScreen';
import MilestoneDetailScreen from './src/screens/MilestoneDetailScreen';
import RemarksScreen from './src/screens/RemarksScreen';

export type RootStackParamList = {
  Login: undefined;
  ProjectList: undefined;
  PackageList: { projectId: string; projectName: string };
  PackageDashboard: { packageId: string; packageName: string };
  InvoiceForm: { packageId: string; currency: string; userName: string };
  CashInflowForm: { packageId: string; currency: string; userName: string };
  CashOutflowForm: { packageId: string; currency: string; userName: string };
  MilestoneForm: { packageId: string; orgId: string; userName: string };
  MilestoneDetail: { packageId: string; orgId: string; milestoneName: string; userName: string };
  Remarks: { packageId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Header title that keeps the current project name visible above each screen's own title.
function HeaderTitle({ children }: { children?: string }) {
  const { projectName } = useProject();
  return (
    <View style={headerStyles.wrap}>
      {projectName ? (
        <Text style={headerStyles.project} numberOfLines={1}>{projectName}</Text>
      ) : null}
      <Text style={headerStyles.title} numberOfLines={1}>{children}</Text>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  project: { color: '#93c5fd', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  title: { color: '#ffffff', fontSize: 17, fontWeight: '600' },
});

const HEADER = {
  headerStyle: { backgroundColor: '#1e3a5f' },
  headerTintColor: '#ffffff',
  headerTitleAlign: 'center' as const,
  headerBackTitleVisible: false,
  headerTitle: (props: { children?: string }) => <HeaderTitle {...props} />,
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
            <Stack.Screen name="PackageList"      component={PackageListScreen}      options={{ title: 'Packages' }} />
            <Stack.Screen name="PackageDashboard" component={PackageDashboardScreen} options={({ route }) => ({ title: route.params.packageName })} />
            <Stack.Screen name="InvoiceForm"      component={InvoiceFormScreen}      options={{ title: 'Add Invoice' }} />
            <Stack.Screen name="CashInflowForm"   component={CashInflowFormScreen}   options={{ title: 'Add Cash Inflow' }} />
            <Stack.Screen name="CashOutflowForm"  component={CashOutflowFormScreen}  options={{ title: 'Add Cash Outflow' }} />
            <Stack.Screen name="MilestoneForm"    component={MilestoneFormScreen}    options={{ title: 'Milestones' }} />
            <Stack.Screen name="MilestoneDetail"  component={MilestoneDetailScreen}  options={({ route }) => ({ title: route.params.milestoneName })} />
            <Stack.Screen name="Remarks"          component={RemarksScreen}          options={{ title: 'Progress Remarks' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ProjectProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </ProjectProvider>
    </AuthProvider>
  );
}

registerRootComponent(App);
