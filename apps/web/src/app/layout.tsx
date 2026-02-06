export const metadata = {
  title: 'Bug Slayer: The Debugging Dungeon',
  description: 'Turn-based RPG where you battle bugs and manage Tech Debt',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e1e1e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Prevent mobile browser touch behaviors that interfere with game */
            #phaser-game canvas {
              touch-action: none;
              -webkit-touch-callout: none;
              -webkit-user-select: none;
              user-select: none;
            }

            /* Prevent pull-to-refresh */
            body.game-active {
              overscroll-behavior: none;
            }

            /* Safe area padding for notched devices */
            .safe-area-padding {
              padding-top: env(safe-area-inset-top);
              padding-bottom: env(safe-area-inset-bottom);
              padding-left: env(safe-area-inset-left);
              padding-right: env(safe-area-inset-right);
            }
          `
        }} />
      </head>
      <body>
        {children}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').then((registration) => {
                console.log('SW registered:', registration);
              }).catch((error) => {
                console.log('SW registration failed:', error);
              });
            });
          }
        `}} />
      </body>
    </html>
  )
}
