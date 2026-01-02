# Knot App - Environment Setup Guide

## 🚀 Quick Start

### Step 1: Create Environment File

1. **Copy the example environment file:**
   ```bash
   cd mobile
   cp .env.example .env
   ```

2. **Open the `.env` file in your editor:**
   ```bash
   # On Mac
   open .env

   # Or use any text editor
   nano .env
   ```

### Step 2: Set Up Supabase (Required)

1. **Create a Supabase Account:**
   - Go to [supabase.com](https://supabase.com)
   - Click "Start your project"
   - Sign up with GitHub or email

2. **Create a New Project:**
   - Click "New Project"
   - Choose your organization
   - Enter project details:
     - Name: `knot-app` (or any name)
     - Database Password: (save this securely)
     - Region: Choose closest to you
   - Click "Create new project"
   - Wait for project to be ready (2-3 minutes)

3. **Get Your API Keys:**
   - Go to Settings → API
   - Copy these values:
     - **Project URL**: `https://[your-project-ref].supabase.co`
     - **Anon/Public Key**: `eyJhbGc...` (long string)

4. **Add to `.env` file:**
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...[your-anon-key]
   ```

5. **Set Up Database Schema:**
   - In Supabase Dashboard, go to SQL Editor
   - Click "New Query"
   - Copy entire contents of `SUPABASE_SCHEMA.sql`
   - Paste and click "Run"
   - You should see "Success" messages

6. **Enable Phone Authentication:**
   - Go to Authentication → Providers
   - Find "Phone" and toggle it ON
   - Configure:
     - Enable Phone Signup: ON
     - SMS Provider: Choose "Twilio" (for production) or leave default for testing

### Step 3: Set Up Google Maps (Required for location features)

1. **Get Google Maps API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create new project or select existing
   - Enable APIs:
     - Maps SDK for Android
     - Maps SDK for iOS
     - Places API
     - Geocoding API

2. **Create API Key:**
   - Go to "Credentials"
   - Click "Create Credentials" → "API Key"
   - Copy the key

3. **Add to `.env` file:**
   ```
   EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIza...[your-api-key]
   ```

4. **Restrict API Key (Important for security):**
   - Click on your API key
   - Under "Application restrictions":
     - For development: "None" is OK
     - For production: Choose "iOS apps" and/or "Android apps"
   - Under "API restrictions":
     - Select "Restrict key"
     - Choose only the APIs you enabled

### Step 4: Run the App

1. **Install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **Start the development server:**
   ```bash
   npm start
   ```

3. **Run on your device:**
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app on your phone

## 🧪 Testing Without Authentication

The app includes a **Dev Mode bypass** for testing:

1. When you run the app in development mode
2. On the Welcome screen, you'll see a "🔧 Skip Auth (Dev Mode)" button
3. Click it to bypass authentication and go directly to the main app

**Note:** This button only appears in development mode (`__DEV__` is true)

## 📱 Testing on Physical Device

1. **Install Expo Go:**
   - iOS: [App Store](https://apps.apple.com/app/apple-store/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Connect to same WiFi:**
   - Make sure your phone and computer are on the same network

3. **Scan QR Code:**
   - Run `npm start` in the mobile directory
   - Scan the QR code with:
     - iOS: Camera app
     - Android: Expo Go app

## 🔒 Environment Variables Explained

### Required Variables:

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `EXPO_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Public anonymous key | Supabase Dashboard → Settings → API |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | Google Cloud Console → Credentials |

### Optional Variables:

| Variable | Description | Used For |
|----------|-------------|----------|
| `EXPO_PUBLIC_SENTRY_DSN` | Sentry error tracking | Production error monitoring |
| `EXPO_PUBLIC_PERSONA_TEMPLATE_ID` | Persona ID verification | Future feature: ID verification |
| `EXPO_PUBLIC_PERSONA_ENVIRONMENT` | Persona environment | Set to "sandbox" for testing |

## 🐛 Troubleshooting

### Issue: "Missing environment variables" warning
**Solution:** Make sure your `.env` file exists and contains all required variables

### Issue: Can't connect to Supabase
**Solution:**
1. Check your Supabase URL doesn't have trailing slash
2. Verify your anon key is copied completely
3. Make sure your Supabase project is active

### Issue: Google Maps not showing
**Solution:**
1. Ensure Maps SDK is enabled in Google Cloud Console
2. Check API key restrictions
3. For iOS: May need to add key to `ios/[YourApp]/Info.plist`

### Issue: Phone auth not working
**Solution:**
1. Enable Phone provider in Supabase Authentication settings
2. For production: Configure Twilio SMS provider
3. For testing: Use Supabase's test phone numbers

## 🚨 Security Notes

1. **Never commit `.env` file** - It's in `.gitignore` for a reason
2. **Use different keys for production** - Don't use dev keys in production
3. **Restrict API keys** - Always restrict Google Maps API keys
4. **Enable RLS** - Row Level Security is already set up in the schema

## 📚 Next Steps

1. Run the database schema in Supabase
2. Test the app with dev mode bypass
3. Implement remaining screens
4. Set up proper authentication flow
5. Configure production environment

## 🆘 Need Help?

- [Supabase Docs](https://supabase.com/docs)
- [Expo Docs](https://docs.expo.dev)
- [Google Maps Platform Docs](https://developers.google.com/maps/documentation)

---

**Remember:** The `.env` file contains sensitive information. Never share it or commit it to version control!