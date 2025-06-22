
import { CapacitorConfig } from '@capacitor/core';

const config: CapacitorConfig = {
  appId: 'app.lovable.cf99100cc87046b081201f5692606053',
  appName: 'Knot',
  webDir: 'dist',
  server: {
    url: 'https://cf99100c-c870-46b0-8120-1f5692606053.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#4169E1',
      showSpinner: false
    }
  }
};

export default config;
