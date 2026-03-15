import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.namou.app',
  appName: 'namou',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#F6F1E6',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      backgroundColor: '#F6F1E6',
      showSpinner: false,
    },
  },
}

export default config
