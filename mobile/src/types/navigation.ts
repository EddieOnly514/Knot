/**
 * Navigation Types
 */

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { TripMode } from './models';

// Auth Stack (full onboarding flow)
export type AuthStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  PhoneVerification: undefined;
  OTPVerification: { phone: string };
  ProfileSetup: undefined;
  WelcomeLoading: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  Home: undefined;
  Matches: undefined;
  Profile: undefined;
};

// Root Stack (combines Auth and Main)
export type RootStackParamList = {
  Loading: undefined;
  Auth: undefined;
  Main: undefined;
  PlanRide: undefined;
  DestinationSearchScreen: { scheduleLater?: boolean };
  TripSearch: {
    scheduleLater?: boolean;
    destination?: {
      id: string;
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      type: string;
    };
    origin?: {
      id?: string;
      name: string;
      address: string;
      latitude: number;
      longitude: number;
    };
  };
  CreateTripNow: undefined;
  CreateTripArrival: undefined;
  // Matching flow
  FindingMatches: {
    tripIntentId?: string;
    destination?: string;
    partySize?: number;
    luggage?: string;
    rideType?: 'standard' | 'xl';
    departureTime?: string;
  };
  MatchesList: undefined;
  MatchDetail: { matchId: string };
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
export type SplashScreenProps = NativeStackScreenProps<AuthStackParamList, 'Splash'>;
export type OnboardingScreenProps = NativeStackScreenProps<AuthStackParamList, 'Onboarding'>;
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