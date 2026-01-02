# Implementation TODO List

## ✅ Phase 1: MVP Foundation (COMPLETED)

- [x] Project setup with Expo + TypeScript
- [x] Install core dependencies (Navigation, Supabase, React Query, Zustand)
- [x] Design system (theme, colors, spacing matching web app)
- [x] Reusable UI components (Button, Input, Card, Avatar)
- [x] Supabase database schema with PostGIS
- [x] Supabase client configuration
- [x] Zustand auth store
- [x] React Navigation setup (Auth + Main stacks)
- [x] Login screen with Apple/Google/Email UI
- [x] Auth service (Apple Sign-In, Email auth)
- [x] Home screen with two tabs (Current Location, Airport)
- [x] Matching results screen
- [x] Chat screen UI (Gifted Chat)
- [x] Profile screen
- [x] Environment configuration
- [x] Documentation (README, QUICKSTART, ARCHITECTURE)
- [x] TypeScript compilation (no errors)

---

## 🚧 Phase 2: Location Services (NEXT UP)

### expo-location Integration
- [ ] Request location permissions (iOS Info.plist)
- [ ] Implement `getCurrentPositionAsync()` on Home screen
- [ ] Display current location address
- [ ] Error handling for permission denied
- [ ] Background location tracking setup (optional)

**Estimated Time:** 4-6 hours

**Files to modify:**
- `src/screens/HomeScreen.tsx`
- `src/services/location.ts` (new)
- `app.json` (add location permissions)

---

## 🗺️ Phase 3: Google Maps Integration

### Maps Setup
- [ ] Add `react-native-maps` to project
- [ ] Configure Google Maps API key in app.json
- [ ] Create MapView component
- [ ] Show user location on map
- [ ] Add markers for nearby matches
- [ ] Implement map region auto-zoom

### Geocoding
- [ ] Implement reverse geocoding (lat/lng → address)
- [ ] Implement forward geocoding (address → lat/lng)
- [ ] Add Google Places autocomplete for destination input
- [ ] Display address suggestions

**Estimated Time:** 1 day

**Files to modify:**
- `src/components/MapView.tsx` (new)
- `src/services/geocoding.ts` (new)
- `src/screens/HomeScreen.tsx`
- `src/screens/MatchingResultsScreen.tsx`
- `app.json`

---

## 🔄 Phase 4: Real Matching Logic

### Search Creation
- [ ] Create search service with Supabase queries
- [ ] Implement `createSearch()` mutation
- [ ] Store geography data (PostGIS format)
- [ ] Handle search form submission
- [ ] Loading states during search

### Match Finding
- [ ] Call `find_nearby_searches()` Postgres function
- [ ] Parse geography results
- [ ] Calculate distances for display
- [ ] Sort matches by proximity
- [ ] Handle no matches case

### Match Management
- [ ] Create match record when users connect
- [ ] Accept/reject match functionality
- [ ] View active matches list

**Estimated Time:** 1-2 days

**Files to modify:**
- `src/services/search.ts` (new)
- `src/services/matching.ts` (new)
- `src/screens/HomeScreen.tsx`
- `src/screens/MatchingResultsScreen.tsx`
- `src/hooks/useSearch.ts` (new)
- `src/hooks/useMatches.ts` (new)

---

## 💬 Phase 5: Real-Time Chat

### Supabase Realtime Setup
- [ ] Create chat when match is accepted
- [ ] Join chat_participants table
- [ ] Set up Realtime channel subscription
- [ ] Listen for new messages
- [ ] Send messages to Supabase
- [ ] Update Gifted Chat with new messages

### Chat Features
- [ ] Display chat history from database
- [ ] Show typing indicators
- [ ] Message read receipts
- [ ] Quick message templates
- [ ] Safety warning in chat header

**Estimated Time:** 1-2 days

**Files to modify:**
- `src/services/chat.ts` (new)
- `src/screens/ChatScreen.tsx`
- `src/hooks/useChat.ts` (new)
- `src/hooks/useMessages.ts` (new)

---

## 📱 Phase 6: Push Notifications

### Setup
- [ ] Install expo-notifications
- [ ] Request notification permissions
- [ ] Get and store push token in database
- [ ] Configure APNs credentials (iOS)

### Notification Triggers
- [ ] Send notification on new match
- [ ] Send notification on new message
- [ ] Handle notification tap → navigate to chat
- [ ] Badge count for unread messages

**Estimated Time:** 1 day

**Files to modify:**
- `src/services/notifications.ts` (new)
- `App.tsx` (notification listeners)
- `app.json` (notification config)

---

## 📸 Phase 7: Profile Management

### Image Upload
- [ ] Install expo-image-picker
- [ ] Request camera/photo library permissions
- [ ] Implement profile photo upload
- [ ] Upload to Supabase Storage
- [ ] Update user avatar_url
- [ ] Display uploaded photo

### Profile Editing
- [ ] Edit profile screen
- [ ] Update user name
- [ ] Update phone number
- [ ] Save changes to Supabase

**Estimated Time:** 4-6 hours

**Files to modify:**
- `src/screens/EditProfileScreen.tsx` (new)
- `src/services/profile.ts` (new)
- `src/screens/ProfileScreen.tsx`

---

## 🆔 Phase 8: Identity Verification

### Persona/Onfido Integration
- [ ] Choose verification provider (Persona recommended)
- [ ] Add SDK dependency
- [ ] Create verification flow screen
- [ ] Trigger verification from profile
- [ ] Handle verification callback
- [ ] Update `identity_verified` flag in database
- [ ] Display verification badge

**Estimated Time:** 1 day

**Files to modify:**
- `src/screens/VerificationScreen.tsx` (new)
- `src/services/verification.ts` (new)
- `src/screens/ProfileScreen.tsx`

---

## 🔗 Phase 9: Deep Linking & Uber/Lyft

### Deep Links
- [ ] Install expo-linking
- [ ] Implement "Open in Uber" button
- [ ] Implement "Open in Lyft" button
- [ ] Pass destination coordinates to app
- [ ] Handle app not installed case → web fallback

**Estimated Time:** 2-3 hours

**Files to modify:**
- `src/services/rideshare.ts` (new)
- `src/screens/ChatScreen.tsx`
- `src/screens/MatchingResultsScreen.tsx`

---

## 🗄️ Phase 10: Search History

### History Tracking
- [ ] Save searches to database automatically
- [ ] Implement search history query
- [ ] Display history in profile screen
- [ ] Tap to re-run previous search
- [ ] Delete history items

**Estimated Time:** 3-4 hours

**Files to modify:**
- `src/screens/ProfileScreen.tsx`
- `src/screens/SearchHistoryScreen.tsx` (new)
- `src/hooks/useSearchHistory.ts` (new)

---

## 🎨 Phase 11: UI Polish

### Loading States
- [ ] Add skeleton loaders for lists
- [ ] Loading spinners for async actions
- [ ] Smooth transitions between screens

### Error Handling
- [ ] Network error messages
- [ ] Retry buttons
- [ ] Offline indicator
- [ ] Form validation errors

### Animations
- [ ] Fade-in animations for screens
- [ ] Slide animations for modals
- [ ] Haptic feedback on button presses

**Estimated Time:** 1 day

---

## 🧪 Phase 12: Testing

### Manual Testing
- [ ] Test on iOS Simulator (multiple device sizes)
- [ ] Test on physical iPhone
- [ ] Test on Android Emulator
- [ ] Test on physical Android device

### Test Cases
- [ ] Sign up new user
- [ ] Sign in existing user
- [ ] Create search from current location
- [ ] Create search from airport
- [ ] Match with another user
- [ ] Send/receive messages
- [ ] Upload profile photo
- [ ] Sign out and back in
- [ ] Handle offline mode
- [ ] Handle permission denied

### Bug Fixes
- [ ] Fix any crashes
- [ ] Fix layout issues
- [ ] Fix navigation bugs
- [ ] Fix data sync issues

**Estimated Time:** 2 days

---

## 📊 Phase 13: Analytics & Monitoring

### Firebase Setup
- [ ] Create Firebase project
- [ ] Add iOS app to Firebase
- [ ] Add GoogleService-Info.plist
- [ ] Install Firebase Analytics
- [ ] Install Firebase Crashlytics

### Event Tracking
- [ ] Track screen views
- [ ] Track sign-ups
- [ ] Track searches created
- [ ] Track matches created
- [ ] Track messages sent

### Error Tracking (Sentry)
- [ ] Install Sentry SDK
- [ ] Configure Sentry DSN
- [ ] Set up source maps
- [ ] Test error reporting

**Estimated Time:** 1 day

---

## 🚀 Phase 14: Production Deployment

### App Store Preparation
- [ ] App icon design (1024x1024)
- [ ] App screenshots (all required sizes)
- [ ] App description
- [ ] Keywords for ASO
- [ ] Privacy policy URL
- [ ] Terms of service URL

### EAS Build Setup
- [ ] Install EAS CLI globally
- [ ] Run `eas build:configure`
- [ ] Configure app signing (Apple Developer account)
- [ ] Create production build profile

### TestFlight Beta
- [ ] Build for TestFlight (`eas build --platform ios`)
- [ ] Submit to TestFlight
- [ ] Invite beta testers
- [ ] Collect feedback
- [ ] Fix critical bugs

### App Store Submission
- [ ] Create App Store Connect listing
- [ ] Upload screenshots
- [ ] Fill in app information
- [ ] Set pricing (free)
- [ ] Submit for review
- [ ] Respond to review feedback

**Estimated Time:** 2-3 days

---

## 📱 Optional Enhancements

### Advanced Features
- [ ] Background location tracking
- [ ] Driver rating system
- [ ] In-app payments (split ride costs)
- [ ] Trip history
- [ ] Favorite destinations
- [ ] Recurring trip schedules
- [ ] Group rides (3+ people)
- [ ] Carbon footprint calculator

### Platform Support
- [ ] Android-specific UI adjustments
- [ ] Android build and testing
- [ ] Google Play Store submission

---

## Time Estimates Summary

| Phase | Description | Time |
|-------|-------------|------|
| ✅ Phase 1 | MVP Foundation | DONE |
| Phase 2 | Location Services | 4-6 hours |
| Phase 3 | Google Maps | 1 day |
| Phase 4 | Real Matching | 1-2 days |
| Phase 5 | Real-Time Chat | 1-2 days |
| Phase 6 | Push Notifications | 1 day |
| Phase 7 | Profile Management | 4-6 hours |
| Phase 8 | ID Verification | 1 day |
| Phase 9 | Deep Linking | 2-3 hours |
| Phase 10 | Search History | 3-4 hours |
| Phase 11 | UI Polish | 1 day |
| Phase 12 | Testing | 2 days |
| Phase 13 | Analytics | 1 day |
| Phase 14 | Deployment | 2-3 days |

**Total Estimated Time: 12-15 days**

---

## Priority Order

### Must-Have (P0) - For Launch
1. ✅ MVP Foundation
2. Location Services
3. Google Maps
4. Real Matching
5. Real-Time Chat
6. Profile Management
7. Testing
8. Deployment

### Should-Have (P1) - Post-Launch v1.1
1. Push Notifications
2. Search History
3. ID Verification
4. Analytics
5. UI Polish

### Nice-to-Have (P2) - Future Versions
1. Deep Linking
2. Advanced features
3. Android support

---

## Next Action Items

**Immediate (This Week):**
1. Set up Supabase account → Run SQL schema
2. Get Google Maps API key
3. Start Phase 2 (Location Services)

**Short-term (Next 2 Weeks):**
1. Complete Phases 2-5 (core matching + chat)
2. Test with real users
3. Fix bugs

**Long-term (Next Month):**
1. Complete Phases 6-11 (polish)
2. Beta testing
3. App Store submission
