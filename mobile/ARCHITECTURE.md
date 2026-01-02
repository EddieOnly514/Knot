# Mobile App Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Knot Ride Buddy Mobile                   │
│                    (React Native + Expo)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      App.tsx (Root)                          │
│  - QueryClientProvider (React Query)                         │
│  - RootNavigator                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Navigation Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Stack   │  │  Main Tabs   │  │  Modals      │      │
│  │  - Login     │  │  - Home      │  │  - Profile   │      │
│  │              │  │  - Matching  │  │  - Settings  │      │
│  │              │  │  - Chat      │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    State Management                          │
│  ┌──────────────────────┐  ┌──────────────────────┐        │
│  │   Zustand Store      │  │   React Query        │        │
│  │   - Auth State       │  │   - Server Cache     │        │
│  │   - User Data        │  │   - API Calls        │        │
│  │   - Session          │  │   - Mutations        │        │
│  └──────────────────────┘  └──────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Auth Service │  │Location Svc  │  │  Chat Svc    │      │
│  │ - Sign In    │  │ - Get GPS    │  │ - Send Msg   │      │
│  │ - Sign Up    │  │ - Geocode    │  │ - Subscribe  │      │
│  │ - Sign Out   │  │ - Autocomplete│ │ - History    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Client Layer                       │
│  ┌────────────────────────────────────────────────┐         │
│  │         @supabase/supabase-js                  │         │
│  │  - Auth: signInWithOAuth, signInWithPassword   │         │
│  │  - Database: from(), select(), insert()        │         │
│  │  - Realtime: channel(), subscribe()            │         │
│  │  - Storage: upload(), download()               │         │
│  └────────────────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Supabase)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Auth       │  │  PostgreSQL  │  │  Realtime    │      │
│  │ - Apple      │  │  + PostGIS   │  │ - WebSocket  │      │
│  │ - Google     │  │  - users     │  │ - Broadcast  │      │
│  │ - Email      │  │  - searches  │  │ - Presence   │      │
│  │ - Session    │  │  - matches   │  │              │      │
│  │              │  │  - chats     │  │              │      │
│  │              │  │  - messages  │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### 1. User Sign-In Flow

```
User taps "Sign in with Apple"
         │
         ▼
LoginScreen → authService.signInWithApple()
         │
         ▼
expo-apple-authentication (native module)
         │
         ▼
Supabase Auth API → signInWithIdToken()
         │
         ▼
Supabase creates session + JWT
         │
         ▼
authStore.setSession() + authStore.setUser()
         │
         ▼
RootNavigator re-renders → Main Stack
         │
         ▼
User sees HomeScreen
```

### 2. Location Matching Flow

```
User enters destination on HomeScreen
         │
         ▼
Tap "Find Ride Buddies"
         │
         ▼
expo-location.getCurrentPositionAsync()
         │
         ▼
Create search record in Supabase
  INSERT INTO searches (user_id, current_location, destination, ...)
         │
         ▼
Call find_nearby_searches() function
  → PostGIS geography query
  → ST_DWithin(location, user_location, radius)
         │
         ▼
Return matching searches
         │
         ▼
Navigate to MatchingResultsScreen
         │
         ▼
Display list of ride buddies
```

### 3. Real-Time Chat Flow

```
User sends message in ChatScreen
         │
         ▼
GiftedChat.onSend()
         │
         ▼
INSERT INTO messages (chat_id, sender_id, content)
         │
         ▼
Supabase Realtime broadcasts to channel
         │
         ▼
Other user's app receives via WebSocket
  supabase.channel('chat:123').on('postgres_changes')
         │
         ▼
Update local messages state
         │
         ▼
GiftedChat re-renders with new message
```

## Component Hierarchy

```
App.tsx
└── QueryClientProvider
    └── RootNavigator
        ├── NavigationContainer
        └── RootStack.Navigator
            ├── Auth Stack (if not logged in)
            │   └── LoginScreen
            │       ├── Button (Apple Sign-In)
            │       ├── Button (Google Sign-In)
            │       ├── Input (Email)
            │       ├── Input (Password)
            │       └── Button (Submit)
            │
            └── Main Stack (if logged in)
                └── MainTab.Navigator
                    ├── Home Tab
                    │   └── HomeScreen
                    │       ├── Tab Switcher (Current/Airport)
                    │       ├── Card (Current Location)
                    │       │   ├── Input (Destination)
                    │       │   ├── Button[] (Radius options)
                    │       │   └── Button (Find Buddies)
                    │       └── Card (Airport)
                    │           ├── Button[] (Airport selector)
                    │           ├── Input (Arrival time)
                    │           ├── Input (Destination)
                    │           └── Button (Find Matches)
                    │
                    ├── Matching Screen
                    │   └── MatchingResultsScreen
                    │       └── FlatList
                    │           └── Card (per match)
                    │               ├── Avatar
                    │               ├── User info
                    │               └── Button (Match & Chat)
                    │
                    ├── Chat Screen
                    │   └── ChatScreen
                    │       └── GiftedChat
                    │           ├── Message bubbles
                    │           ├── Input composer
                    │           └── Send button
                    │
                    └── Profile Tab
                        └── ProfileScreen
                            ├── Card (User info)
                            │   ├── Avatar
                            │   └── Button (Edit)
                            ├── Card (ID Verification)
                            └── Button (Sign Out)
```

## State Management Strategy

### Zustand Store (Local State)
**Used for:** Authentication, user session, UI state

```typescript
authStore: {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
}
```

### React Query (Server State)
**Used for:** API data fetching, caching, mutations

```typescript
// Queries (GET)
useQuery(['searches', userId])
useQuery(['matches', searchId])
useQuery(['chats', userId])

// Mutations (POST/PUT/DELETE)
useMutation(createSearch)
useMutation(sendMessage)
useMutation(updateProfile)
```

### Local Component State
**Used for:** Form inputs, temporary UI state

```typescript
const [destination, setDestination] = useState('')
const [selectedRadius, setSelectedRadius] = useState(0.5)
```

## Security Model

### Row Level Security (RLS)

```sql
-- Users can only update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Users can view all searches (for matching)
CREATE POLICY "Users can view all searches" ON searches
  FOR SELECT USING (true);

-- Only chat participants can view messages
CREATE POLICY "Participants can view messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_id = messages.chat_id
      AND user_id = auth.uid()
    )
  );
```

### API Key Security

```typescript
// Environment variables (never committed)
EXPO_PUBLIC_SUPABASE_ANON_KEY  // Public, safe to expose
SUPABASE_SERVICE_KEY           // Private, server-only (not used in app)

// Client-side security
- All requests use JWT from Supabase Auth
- RLS enforces permissions at database level
- No sensitive keys in app bundle
```

## Performance Optimizations

### 1. React Query Caching
```typescript
queryClient.setQueryData(['user', userId], userData)
// Subsequent requests use cache for 5 minutes
```

### 2. PostGIS Spatial Indexes
```sql
CREATE INDEX searches_current_location_idx
  ON searches USING GIST(current_location);
-- Fast geographic queries (< 50ms)
```

### 3. Realtime Presence
```typescript
channel.track({ online_at: new Date().toISOString() })
// Efficient WebSocket connection for live features
```

### 4. Image Optimization
```typescript
<Image
  source={{ uri: avatar_url }}
  cachePolicy="memory-disk"
  contentFit="cover"
/>
// expo-image with caching
```

## Third-Party Integrations

### Current
- **Supabase**: Backend, auth, database, realtime
- **Expo**: Build system, native modules
- **React Navigation**: Navigation
- **Gifted Chat**: Chat UI

### Planned
- **Google Maps Platform**: Maps, geocoding, places
- **Persona/Onfido**: ID verification
- **Sentry**: Error tracking
- **Firebase**: Analytics, crashlytics
- **Deep Linking**: Uber/Lyft apps

## Deployment Pipeline

```
Local Development
    │
    ▼
EAS Build (Cloud)
    │
    ├── iOS
    │   ├── Development Build (for testing)
    │   ├── TestFlight Build (internal beta)
    │   └── App Store Build (production)
    │
    └── Android
        ├── Development APK
        ├── Google Play Internal Testing
        └── Google Play Production
```

## Monitoring & Analytics

### Planned Setup

```
User Action → Event
    │
    ├── Firebase Analytics
    │   - Screen views
    │   - Button taps
    │   - Search attempts
    │
    ├── Sentry
    │   - Crashes
    │   - Errors
    │   - Performance
    │
    └── Supabase Logs
        - Auth events
        - Database queries
        - RLS violations
```

## Offline Support (Future)

```typescript
// React Query persistence
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'

const persister = createSyncStoragePersister({
  storage: AsyncStorage,
})

// Offline-first mutations queue
useMutation({
  mutationFn: sendMessage,
  onError: (error) => {
    // Queue for retry when online
    queueOfflineMutation(mutation)
  },
})
```

## Testing Strategy

### Unit Tests (Planned)
- Services: `auth.test.ts`, `location.test.ts`
- Utilities: Date formatting, distance calculations
- Components: Button, Input rendering

### Integration Tests (Planned)
- Auth flow: Sign in → Home screen
- Matching flow: Search → Results → Chat
- Real-time: Send message → Receive message

### E2E Tests (Planned)
- Detox for full user flows
- iOS Simulator automation

---

This architecture provides:
✅ Scalable backend (Supabase)
✅ Type-safe frontend (TypeScript)
✅ Real-time capabilities (WebSocket)
✅ Native performance (React Native)
✅ Production-ready structure
