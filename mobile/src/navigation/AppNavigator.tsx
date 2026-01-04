import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, ActivityIndicator } from 'react-native';

// Import auth
import { useAuth } from '../contexts/AuthContext';

// Import auth/onboarding screens
import { SplashScreen } from '../screens/auth/SplashScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';
import { PhoneVerificationScreen } from '../screens/auth/PhoneVerificationScreen';
import { OTPVerificationScreen } from '../screens/auth/OTPVerificationScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { WelcomeLoadingScreen } from '../screens/auth/WelcomeLoadingScreen';

// Import main screens
import { HomeScreen } from '../screens/main/HomeScreen';
import { TripSearchScreen } from '../screens/trip/TripSearchScreen';
import { DestinationSearchScreen } from '../screens/trip/DestinationSearchScreen';
import { PlanRideScreen } from '../screens/trip/PlanRideScreen';
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

// Import matching flow screens
import { FindingMatchesScreen } from '../screens/match/FindingMatchesScreen';
import { MatchesListScreen } from '../screens/match/MatchesListScreen';
import { MatchDetailScreen } from '../screens/match/MatchDetailScreen';

// Import types
import {
  RootStackParamList,
  AuthStackParamList,
  MainTabParamList,
} from '../types/navigation';

// Import design system
import { colors, typography } from '../design';

// Import actual ProfileScreen
import { ProfileScreen } from '../screens/main/ProfileScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

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

// Loading Screen
function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

// Auth Navigator - Splash → Onboarding → Phone → OTP → ProfileSetup → WelcomeLoading
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
    </AuthStack.Navigator>
  );
}

// Main Tab Navigator
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
        component={MatchesListScreen}
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

// Root Navigator - Uses AuthContext for clean routing
export function AppNavigator() {
  const { loading, isAuthenticated } = useAuth();

  // Show loading screen while checking auth
  if (loading) {
    return (
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          <RootStack.Screen name="Loading" component={LoadingScreen} />
        </RootStack.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <RootStack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!isAuthenticated ? (
          // Not signed in -> Show Auth flow (Splash → Onboarding → Phone → OTP → etc.)
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          // Signed in -> Show Main App
          <>
            <RootStack.Screen name="Main" component={MainTabNavigator} />
            <RootStack.Screen
              name="PlanRide"
              component={PlanRideScreen}
              options={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 200,
              }}
            />
            <RootStack.Screen name="DestinationSearchScreen" component={DestinationSearchScreen} options={{ headerShown: false, animation: 'fade' }} />
            <RootStack.Screen
              name="TripSearch"
              component={TripSearchScreen}
              options={{
                headerShown: false,
                animation: 'fade',
                animationDuration: 200,
              }}
            />
            <RootStack.Screen name="CreateTripNow" component={CreateTripNowScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="CreateTripArrival" component={CreateTripArrivalScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="MatchFeed" component={MatchFeedScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="Chat" component={ChatScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="RideLaunch" component={RideLaunchScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="PostTrip" component={PostTripScreen} options={{ headerShown: false }} />
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
            {/* Matching Flow */}
            <RootStack.Screen name="FindingMatches" component={FindingMatchesScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="MatchesList" component={MatchesListScreen} options={{ headerShown: false }} />
            <RootStack.Screen name="MatchDetail" component={MatchDetailScreen} options={{ headerShown: false }} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}