# Quick Start Guide - Knot Ride Buddy Mobile

Get the mobile app running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- iOS Simulator (comes with Xcode on macOS)

## Step 1: Install Dependencies

```bash
cd mobile
npm install
```

## Step 2: Start the App

```bash
npm run ios
```

This will:
- Start the Expo dev server
- Open iOS Simulator automatically
- Build and run the app

## Step 3: Test the App (Without Backend)

The app will show warnings about missing Supabase credentials, but you can still navigate through the UI:

1. **Login Screen** - You'll see the login UI with Apple/Google/Email options
2. **Home Screen** - Browse the matching interface with two tabs
3. **Profile Screen** - View the profile layout

Note: Authentication won't work until you set up Supabase (see full setup below).

## Full Setup (To Enable Backend Features)

### 1. Create Supabase Account

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Click "New Project"
3. Fill in:
   - Project name: `knot-ride-buddy`
   - Database password: (create a secure password)
   - Region: (choose closest to you)
4. Wait for project to be created (~2 minutes)

### 2. Get Supabase Credentials

1. In your Supabase dashboard, go to **Settings** > **API**
2. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

### 3. Set Up Database

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Open the file `/mobile/SUPABASE_SCHEMA.sql` in your code editor
4. Copy ALL the SQL content
5. Paste into Supabase SQL Editor
6. Click "Run" (bottom right)
7. You should see "Success. No rows returned"

### 4. Enable Auth Providers

#### Email Auth (Already Enabled)
Email authentication works by default - no additional setup needed!

#### Apple Sign-In (iOS Production Only)
For development, you can skip this. For production:
1. In Supabase: **Authentication** > **Providers** > **Apple**
2. Follow [Supabase Apple Auth Guide](https://supabase.com/docs/guides/auth/social-login/auth-apple)

### 5. Update Environment Variables

Edit `/mobile/.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 6. Restart the App

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm run ios
```

## Testing Authentication

### Email Sign-Up Flow

1. Tap "Don't have an account? Sign Up"
2. Enter any email and password (8+ characters)
3. Tap "Sign Up"
4. Check your email for confirmation link
5. Click the link to verify
6. Return to app and sign in with the same credentials

### Creating Your First Profile

After signing in:
1. You'll see the Home screen
2. Tap the "Profile" tab at the bottom
3. Your email will be displayed
4. You can tap "Edit Profile" to update your name

## Next Features to Implement

The MVP is complete with UI and navigation. To add full functionality:

1. **Location Services**
   - Implement `expo-location` to get current location
   - Add Google Maps for visualization

2. **Real Matching**
   - Connect "Find Ride Buddies" button to Supabase
   - Query nearby searches using PostGIS

3. **Real-Time Chat**
   - Connect Gifted Chat to Supabase Realtime
   - Enable live messaging between users

4. **Push Notifications**
   - Set up `expo-notifications`
   - Send notifications for new matches

## Troubleshooting

### App crashes on launch
- Make sure you're using Node.js 18 or higher
- Delete `node_modules` and run `npm install` again

### "Cannot find module" errors
- Run `npm install` again
- Make sure you're in the `/mobile` directory

### Simulator not opening
- Make sure Xcode is installed
- Run `sudo xcode-select --switch /Applications/Xcode.app`

### Authentication not working
- Check that you've updated the `.env` file with real Supabase credentials
- Verify you ran the SQL schema in Supabase
- Restart the dev server after changing `.env`

## Useful Commands

```bash
# Start dev server
npm start

# Run on iOS Simulator
npm run ios

# Run on Android Emulator
npm run android

# Check TypeScript errors
npx tsc --noEmit

# Clear cache and restart
npx expo start -c
```

## Need Help?

Check the full [README.md](./README.md) for:
- Complete setup instructions
- Google Maps integration
- Production build guide
- Architecture details
