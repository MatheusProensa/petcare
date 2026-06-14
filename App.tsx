import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/theme';
import { ToastProvider } from './src/hooks/useToast';
import { onboardingRepository } from './src/repositories/onboardingRepository';
import { RootStackParamList } from './src/types';
import OnboardingScreen from './src/screens/OnboardingScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import HomeScreen from './src/screens/HomeScreen';
import AddPetScreen from './src/screens/AddPetScreen';
import PetDetailScreen from './src/screens/PetDetailScreen';
import AddRecordScreen from './src/screens/AddRecordScreen';
import AddWeightScreen from './src/screens/AddWeightScreen';
import WeightScreen from './src/screens/WeightScreen';
import VaccinesScreen from './src/screens/VaccinesScreen';
import MedicationsScreen from './src/screens/MedicationsScreen';
import MedicalProfileScreen from './src/screens/MedicalProfileScreen';
import EmergencyScreen from './src/screens/EmergencyScreen';
import DocumentsScreen from './src/screens/DocumentsScreen';
import DocumentViewerScreen from './src/screens/DocumentViewerScreen';
import StatsScreen from './src/screens/StatsScreen';
import SearchScreen from './src/screens/SearchScreen';
import AboutScreen from './src/screens/AboutScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function Root({ initialRouteName }: { initialRouteName: keyof RootStackParamList }) {
  const { colors, scheme } = useTheme();

  const navTheme = {
    ...DefaultTheme,
    dark: scheme === 'dark',
    colors: {
      ...DefaultTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="AddPet" component={AddPetScreen} />
        <Stack.Screen name="PetDetail" component={PetDetailScreen} />
        <Stack.Screen name="AddRecord" component={AddRecordScreen} />
        <Stack.Screen name="AddWeight" component={AddWeightScreen} />
        <Stack.Screen name="Weight" component={WeightScreen} />
        <Stack.Screen name="Vaccines" component={VaccinesScreen} />
        <Stack.Screen name="Medications" component={MedicationsScreen} />
        <Stack.Screen name="MedicalProfile" component={MedicalProfileScreen} />
        <Stack.Screen name="Emergency" component={EmergencyScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
        <Stack.Screen name="DocumentViewer" component={DocumentViewerScreen} />
        <Stack.Screen name="Stats" component={StatsScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function LoadingScreen() {
  const { colors } = useTheme();
  return (
    <View style={[styles.loading, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

function AppContent() {
  const [onboardingSeen, setOnboardingSeen] = useState<boolean | null>(null);

  useEffect(() => {
    onboardingRepository.getSeen()
      .then(setOnboardingSeen)
      .catch(() => setOnboardingSeen(true));
  }, []);

  if (onboardingSeen === null) return <LoadingScreen />;

  return <Root initialRouteName={onboardingSeen ? 'Dashboard' : 'Onboarding'} />;
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
