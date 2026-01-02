# Knot - Ride Sharing App

A minimalist ride-sharing app that matches travelers heading in the same direction to split Uber/Lyft rides.

## Project Structure

```
mobile/
├── App.tsx                     # Main app entry point
├── src/
│   ├── design/                 # Design system
│   │   ├── colors.ts          # Color palette (#0057FF primary)
│   │   ├── typography.ts      # Font styles and sizes
│   │   ├── spacing.ts         # Spacing scale
│   │   ├── shadows.ts         # Shadow styles
│   │   └── index.ts           # Design system exports
│   │
│   ├── types/                 # TypeScript types
│   │   ├── models.ts          # Business logic models
│   │   ├── navigation.ts      # Navigation types
│   │   └── database.ts        # Supabase database types
│   │
│   ├── screens/               # App screens
│   │   ├── auth/              # Authentication screens
│   │   │   ├── WelcomeScreen.tsx
│   │   │   ├── PhoneVerificationScreen.tsx
│   │   │   ├── OTPVerificationScreen.tsx
│   │   │   └── ProfileSetupScreen.tsx
│   │   ├── main/              # Main app screens
│   │   │   └── HomeScreen.tsx
│   │   └── trip/              # Trip-related screens
│   │       └── CreateTripNowScreen.tsx
│   │
│   ├── components/            # Reusable components
│   │   └── ui/                # UI components
│   │       ├── Button.tsx
│   │       ├── Card.tsx
│   │       └── Input.tsx
│   │
│   ├── navigation/            # Navigation setup
│   │   └── AppNavigator.tsx
│   │
│   ├── services/              # External services
│   │   └── supabase.ts        # Supabase client
│   │
│   └── config/                # Configuration
│       └── env.ts             # Environment variables
│
├── SUPABASE_SCHEMA.sql        # Database schema
└── package.json               # Dependencies

```

## Design System

- **Primary Color**: #0057FF (Tech blue)
- **Background**: Pure white (#FFFFFF)
- **Text**: Dark charcoal (#222222)
- **Typography**: Clean geometric sans-serif
- **UI Style**: Hyper-minimalist with elevated cards and soft shadows

## Key Features

### Implemented ✅
- Welcome & Phone Authentication flow
- Profile setup with photo, luggage preferences
- Home screen with NOW/ARRIVAL mode selection
- Create Trip (NOW mode) with location and destination selection
- Clean navigation structure
- Minimalist UI components
- Complete database schema with RLS policies

### To Be Implemented 📋
- Create Trip (ARRIVAL mode)
- Match Feed with swipe cards
- Real-time Chat
- Meetup confirmation & destination reveal
- Uber/Lyft deep linking
- Post-trip ratings

## Database Schema

The app uses Supabase with PostgreSQL. Key tables:
- `profiles` - User profiles
- `trip_intents` - Trip creation (NOW/ARRIVAL modes)
- `swipes` - Interest actions
- `matches` - Mutual matches
- `messages` - Chat messages
- `blocks`, `reports`, `ratings` - Safety features

## Setup Instructions

1. **Install dependencies**:
   ```bash
   cd mobile
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file in the mobile directory:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
   ```

3. **Set up Supabase**:
   - Create a new Supabase project
   - Go to SQL Editor in Supabase dashboard
   - Run the entire SQL from `SUPABASE_SCHEMA.sql`
   - Enable Phone Auth in Authentication settings

4. **Run the app**:
   ```bash
   npm start
   # Then press 'i' for iOS or 'a' for Android
   ```

## MVP Constraints

- Party size: 1-2 people only
- No in-app payments
- Phone verification required
- Meet in public locations only
- Destination reveal requires mutual confirmation

## Tech Stack

- React Native (Expo)
- TypeScript
- Supabase (Auth, Database, Realtime)
- React Navigation
- React Query
- React Hook Form
- Expo Location & Image Picker
- Google Maps