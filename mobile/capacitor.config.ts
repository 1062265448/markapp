import type { CapacitorConfig } from '@capacitor/cli';

// 仅开发模式（npm run dev）允许 HTTP cleartext + 混合内容
// 生产构建 (npm run cap:build) 必须使用 HTTPS，关闭 cleartext
const isDev = import.meta.env?.DEV ?? process.env.NODE_ENV !== 'production';

const config: CapacitorConfig = {
  appId: 'com.jcngcp.markapp',
  appName: 'MarkApp',
  webDir: 'dist',
  server: {
    // 开发模式：取消注释指向 Vite 地址即可
    // url: 'http://192.168.10.179:5181',
    cleartext: isDev,
    androidScheme: isDev ? 'http' : 'https',
  },
  android: {
    allowMixedContent: isDev,
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
