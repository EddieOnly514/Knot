import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

// Import screens
import { SplashScreen } from '../screens/auth/SplashScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { PhoneVerificationScreen } from '../screens/auth/PhoneVerificationScreen';
import { OTPVerificationScreen } from '../screens/auth/OTPVerificationScreen';
import { WelcomeLoadingScreen } from '../screens/auth/WelcomeLoadingScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { HomeScreen } from '../screens/main/HomeScreen';
import { TripSearchScreen } from '../screens/trip/TripSearchScreen';
import { CreateTripNowScreen } from '../screens/trip/CreateTripNowScreen';
import { MatchFeedScreen } from '../screens/match/MatchFeedScreen';
import { ChatScreen } from '../screens/chat/ChatScreen';
import { PostTripScreen } from '../screens/posttrip/PostTripScreen';

// Import account screens
import { EditProfileScreen } from '../screens/account/EditProfileScreen';
import { TripsHistoryScreen } from '../screens/account/TripsHistoryScreen';
import { SafetyCenterScreen } from '../screens/account/SafetyCenterScreen';
import { NotificationsSettingsScreen } from '../screens/account/NotificationsSettingsScreen';
import { PreferencesScreen } from '../screens/account/PreferencesScreen';
import { PrivacySettingsScreen } from '../screens/account/PrivacySettingsScreen';
import { AccountSecurityScreen } from '../screens/account/AccountSecurityScreen';
import { HelpSupportScreen } from '../screens/account/HelpSupportScreen';
import { LegalScreen } from '../screens/account/LegalScreen';

// Import types
import {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
} from '../types/navigation';

// Import design system
import { colors, typography } from '../design';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Placeholder screens
const MatchesScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <Text style={{ color: colors.text.main }}>Your Matches</Text>
  </View>
);

// Import actual ProfileScreen
import { ProfileScreen } from '../screens/main/ProfileScreen';

const CreateTripArrivalScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <Text style={{ color: colors.text.main }}>Schedule Trip</Text>
  </View>
);

const RideLaunchScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
    <Text style={{ color: colors.text.main }}>Launch Ride</Text>
  </View>
);

// Auth Navigator - Splash → Onboarding → Phone → OTP → ProfileSetup → WelcomeLoading → Main
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.surface },
        animation: 'fade',
      }}
    >
      <AuthStack.Screen name="Splash" component={SplashScreen} />
      <AuthStack.Screen name="Onboarding" component={OnboardingScreen} />
      <AuthStack.Screen name="PhoneVerification" component={PhoneVerificationScreen} />
      <AuthStack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <AuthStack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <AuthStack.Screen name="WelcomeLoading" component={WelcomeLoadingScreen} />
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} />
    </AuthStack.Navigator>
  );
}

// Main Tab Navigator - No icons, just simple text tabs
function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 24,
          height: 70,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarLabelStyle: {
          ...typography.styles.bodySmall,
          fontWeight: '500',
        },
        tabBarShowLabel: true,
        tabBarIconStyle: { display: 'none' },
      }}
    >
      <MainTab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <MainTab.Screen
        name="Matches"
        component={MatchesScreen}
        options={{ tabBarLabel: 'Trips' }}
      />
      <MainTab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Account' }}
      />
    </MainTab.Navigator>
  );
}

// Root Navigator
export function AppNavigator() {
  // DEV MODE: Set to true to bypass auth and go straight to home
  const [bypassAuth, setBypassAuth] = useState(true); // ← SET TO TRUE FOR DEV SKIP
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // TODO: Check authentication status from Supabase
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // TODO: Implement actual auth check
    // const session = await supabase.auth.getSession();
    // setIsAuthenticated(!!session.data.session);

    // For now, just check if we should bypass
    if (__DEV__) {
      // You can set this to true here for dev testing
      setBypassAuth(false); // Set to true to auto-bypass
    }
  };

  // Show main app if authenticated OR if bypassing auth in dev mode
  const showMainApp = isAuthenticated || bypassAuth;

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!showMainApp ? (
          <>
            <RootStack.Screen name="Auth" component={AuthNavigator} />
            <RootStack.Screen name="Main" component={MainTabNavigator} />
          </>
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainTabNavigator} />
            <RootStack.Screen name="Auth" component={AuthNavigator} />
          </>
        )}

        <RootStack.Screen
          name="TripSearch"
          component={TripSearchScreen}
          options={{
            headerShown: false,
          }}
        />
        <RootStack.Screen
          name="CreateTripNow"
          component={CreateTripNowScreen}
          options={{
            headerShown: false,
          }}
        />
        <RootStack.Screen
          name="CreateTripArrival"
          component={CreateTripArrivalScreen}
          options={{
            headerShown: false,
          }}
        />
        <RootStack.Screen
          name="MatchFeed"
          component={MatchFeedScreen}
          options={{
            headerShown: false,
          }}
        />
        <RootStack.Screen
          name="Chat"
          component={ChatScreen}
          options={{
            headerShown: false,
          }}
        />
        <RootStack.Screen
          name="RideLaunch"
          component={RideLaunchScreen}
          options={{
            headerShown: false,
          }}
        />
        <RootStack.Screen
          name="PostTrip"
          component={PostTripScreen}
          options={{
            headerShown: false,
          }}
        />
        {/* Account Subpages */}
        <RootStack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="TripsHistory" component={TripsHistoryScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="SafetyCenter" component={SafetyCenterScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="NotificationsSettings" component={NotificationsSettingsScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Preferences" component={PreferencesScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="PrivacySettings" component={PrivacySettingsScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="AccountSecurity" component={AccountSecurityScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="HelpSupport" component={HelpSupportScreen} options={{ headerShown: false }} />
        <RootStack.Screen name="Legal" component={LegalScreen} options={{ headerShown: false }} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}