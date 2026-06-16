import { useEffect, useState } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import {
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { ThemeProvider, useTheme } from './src/theme';
import { ToastProvider } from './src/hooks/useToast';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { onboardingRepository } from './src/repositories/onboardingRepository';
import { syncDown, syncUp } from './src/services/cloudSync';
import { RootStackParamList } from './src/types';
import LoginScreen from './src/screens/LoginScreen';
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
import LifelineScreen from './src/screens/LifelineScreen';
import GrowthScreen from './src/screens/GrowthScreen';
import TreatmentsScreen from './src/screens/TreatmentsScreen';
import FeedingScreen from './src/screens/FeedingScreen';

SplashScreen.preventAutoHideAsync();

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
        <Stack.Screen name="Lifeline" component={LifelineScreen} />
        <Stack.Screen name="Growth" component={GrowthScreen} />
        <Stack.Screen name="Treatments" component={TreatmentsScreen} />
        <Stack.Screen name="Feeding" component={FeedingScreen} />
        <Stack.Screen name="Search" component={SearchScreen} />
        <Stack.Screen name="About" component={AboutScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [ready, setReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<keyof RootStackParamList>('Dashboard');

  async function handleSignedIn(uid: string, isNewUser: boolean) {
    if (!isNewUser) {
      // Existing user: pull data from cloud
      await syncDown(uid).catch(() => {});
    } else {
      // New user: push whatever local data exists
      await syncUp(uid).catch(() => {});
    }
    const seen = await onboardingRepository.getSeen().catch(() => true);
    setInitialRoute(seen ? 'Dashboard' : 'Onboarding');
    setReady(true);
  }

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setReady(false);
      return;
    }
    // Already logged in: resolve initial route
    onboardingRepository.getSeen()
      .then(seen => setInitialRoute(seen ? 'Dashboard' : 'Onboarding'))
      .catch(() => setInitialRoute('Dashboard'))
      .finally(() => setReady(true));
  }, [user, loading]);

  if (loading || (user && !ready)) return null;

  if (!user) {
    return <LoginScreen onSignedIn={handleSignedIn} />;
  }

  return <Root initialRouteName={initialRoute} />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
