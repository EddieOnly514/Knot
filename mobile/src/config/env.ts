// Environment configuration
// NOTE: In production, use expo-constants and app.json extra config

export const env = {
  // Supabase
  SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',

  // Google Maps
  GOOGLE_MAPS_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '',

  // Sentry
  SENTRY_DSN: process.env.EXPO_PUBLIC_SENTRY_DSN || '',

  // Persona (ID Verification)
  PERSONA_TEMPLATE_ID: process.env.EXPO_PUBLIC_PERSONA_TEMPLATE_ID || '',
  PERSONA_ENVIRONMENT: process.env.EXPO_PUBLIC_PERSONA_ENVIRONMENT || 'sandbox',
} as const;

// Validate required env vars
export function validateEnv() {
  const required = {
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
  };

  const missing = Object.entries(required)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.warn(
      `⚠️  Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and app.json configuration.'
    );
  }

  return missing.length === 0;
}
