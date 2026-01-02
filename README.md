# Knot

**Split rides. Stay safe. Save money.**

Knot is a ride-sharing matchmaking app that helps travelers going to the same destination find each other and split their ride costs. Think of it as "Tinder for ridesharing" — swipe right on compatible travelers, confirm the meetup, and save up to 50% on your ride.

## Core Features

### 🚗 Trip Matching
- **Real-time matching** — Find other travelers heading to the same destination
- **Smart filters** — Match by verified users, pickup distance, and time window
- **NOW or LATER** — Match immediately or schedule trips in advance

### 🛡️ Trust & Safety
- **Phone verification** — All users verify their phone numbers
- **User ratings** — Rate your ride-share experience
- **Safety Center** — Emergency call, live location sharing, blocked users

### 💬 In-App Chat
- **Quick coordination** — Confirm meetup details with your match
- **Ride suggestions** — Knot Bot recommends optimal ride types
- **Real-time updates** — Stay connected during the matching process

### 📍 Smart Meetup
- **Nearby pickup points** — System suggests safe, convenient meetup spots
- **Time windows** — Flexible 15/30/60 min coordination windows
- **Live status** — Track when your match is ready

## Tech Stack

### Mobile App (React Native + Expo)
- React Native with Expo
- TypeScript
- React Navigation
- Supabase (Auth, Database, Realtime)

### Web App (React + Vite)
- React 18 with Vite
- TypeScript
- Tailwind CSS + shadcn/ui
- Supabase JS Client

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo CLI (for mobile)
- Supabase account

### Mobile App

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start Expo dev server
npx expo start
```

### Web App

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Project Structure

```
knot-ride-buddy/
├── mobile/                 # React Native Expo app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # App screens
│   │   ├── navigation/     # React Navigation setup
│   │   ├── design/         # Design tokens & styles
│   │   └── services/       # Supabase & API services
│   └── assets/             # Images & icons
├── src/                    # Web app (React + Vite)
│   ├── components/
│   ├── pages/
│   └── lib/
└── supabase/               # Edge functions
```

## Design Language

- **Primary Color**: Electric Blue (#0052FF)
- **Background**: Soft Gray (#F8F9FA)
- **Cards**: Faded Blue (#EFF6FF)
- **Style**: Minimalist Utility

## License

Private - All rights reserved.
