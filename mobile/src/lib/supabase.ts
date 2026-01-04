import 'react-native-url-polyfill/auto';
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xtlkvchawhwskcnbhaxe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0bGt2Y2hhd2h3c2tjbmJoYXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyOTc4NDksImV4cCI6MjA4Mjg3Mzg0OX0.hDwCxPdeaPxFrSzfeibe_HP-HVrAp9n7bTiUtaO7G7M';

// Secure storage adapter for Supabase auth
const ExpoSecureStoreAdapter = {
    getItem: async (key: string) => {
        try {
            return await SecureStore.getItemAsync(key);
        } catch (error) {
            console.error('SecureStore getItem error:', error);
            return null;
        }
    },
    setItem: async (key: string, value: string) => {
        try {
            await SecureStore.setItemAsync(key, value);
        } catch (error) {
            console.error('SecureStore setItem error:', error);
        }
    },
    removeItem: async (key: string) => {
        try {
            await SecureStore.deleteItemAsync(key);
        } catch (error) {
            console.error('SecureStore removeItem error:', error);
        }
    },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

// Export URL for use in OAuth
export const SUPABASE_URL = supabaseUrl;
