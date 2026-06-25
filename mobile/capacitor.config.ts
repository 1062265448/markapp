import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jcngcp.markapp',
  appName: 'MarkApp',
  webDir: 'dist',
  server: {
    // 开发模式：取消注释指向 Vite 地址即可
    // url: 'http://192.168.10.179:5181',
    cleartext: true,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#FFFFFF',
      showSpinner: false,
    },
    StatusBar: {
      style: 'LIGHT',
      backgroundColor: '#FFFFFF',
      overlaysWebView: false,
    },
    Camera: {
      presentationStyle: 'fullscreen',
    },
  },
};

export default config;
