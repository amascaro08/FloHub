import { Html, Head, Main, NextScript } from "next/document";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta name="application-name" content="FloHub" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FloHub" />
        <meta name="description" content="Your productivity dashboard" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#000000" />
        
        <link rel="manifest" href="/manifest.json" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* Apple Touch Icons */}
        <link rel="apple-touch-icon" href="/icons/apple-icon-180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/apple-icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/apple-icon-167x167.png" />
        
        {/* Apple Splash Screens */}
        <link rel="apple-touch-startup-image" media="screen and (device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)" href="/icons/apple-splash-1290-2796.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)" href="/icons/apple-splash-1179-2556.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)" href="/icons/apple-splash-1284-2778.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)" href="/icons/apple-splash-1170-2532.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="/icons/apple-splash-1125-2436.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)" href="/icons/apple-splash-1242-2688.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)" href="/icons/apple-splash-828-1792.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)" href="/icons/apple-splash-1125-2436.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)" href="/icons/apple-splash-750-1334.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)" href="/icons/apple-splash-640-1136.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)" href="/icons/apple-splash-2048-2732.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)" href="/icons/apple-splash-1668-2388.png" />
        <link rel="apple-touch-startup-image" media="screen and (device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)" href="/icons/apple-splash-1536-2048.png" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
