/**
 * Navigation Types
 */

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { TripMode } from './models';

// Auth Stack
export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  Welcome: undefined;
  PhoneVerification: undefined;
  OTPVerification: { phone: string };
  WelcomeLoading: undefined;
  ProfileSetup: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Matches: undefined;
  Profile: undefined;
};

// Root Stack (combines Auth and Main)
export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  TripSearch: { scheduleLater?: boolean };
  CreateTripNow: undefined;
  CreateTripArrival: undefined;
  MatchFeed: { tripIntentId?: string };
  Chat: { matchId?: string };
  RideLaunch: { matchId: string };
  PostTrip: { matchId?: string };
  // Account subpages
  EditProfile: undefined;
  TripsHistory: undefined;
  SafetyCenter: undefined;
  NotificationsSettings: undefined;
  Preferences: undefined;
  PrivacySettings: undefined;
  AccountSecurity: undefined;
  HelpSupport: undefined;
  Legal: undefined;
};

// Screen Props Types
export type WelcomeScreenProps = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;
export type PhoneVerificationScreenProps = NativeStackScreenProps<AuthStackParamList, 'PhoneVerification'>;
export type OTPVerificationScreenProps = NativeStackScreenProps<AuthStackParamList, 'OTPVerification'>;
export type ProfileSetupScreenProps = NativeStackScreenProps<AuthStackParamList, 'ProfileSetup'>;

export type HomeScreenProps = BottomTabScreenProps<MainTabParamList, 'Home'>;
export type MatchesScreenProps = BottomTabScreenProps<MainTabParamList, 'Matches'>;
export type ProfileScreenProps = BottomTabScreenProps<MainTabParamList, 'Profile'>;

export type CreateTripNowScreenProps = NativeStackScreenProps<RootStackParamList, 'CreateTripNow'>;
export type CreateTripArrivalScreenProps = NativeStackScreenProps<RootStackParamList, 'CreateTripArrival'>;
export type MatchFeedScreenProps = NativeStackScreenProps<RootStackParamList, 'MatchFeed'>;
export type ChatScreenProps = NativeStackScreenProps<RootStackParamList, 'Chat'>;
export type RideLaunchScreenProps = NativeStackScreenProps<RootStackParamList, 'RideLaunch'>;
export type PostTripScreenProps = NativeStackScreenProps<RootStackParamList, 'PostTrip'>;