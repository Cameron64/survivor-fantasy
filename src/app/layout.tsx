import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { PWAUpdateNotification } from '@/components/shared/pwa-update-notification'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { AdminDebugWrapper } from '@/components/shared/admin-debug-wrapper-server'

const devBypass = process.env.NODE_ENV === 'development' && !!process.env.DEV_USER_ID

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Survivor 50 Fantasy League',
  description: 'Fantasy league for Survivor Season 50 - track scores, draft contestants, and compete with friends!',
  applicationName: 'Survivor 50 Fantasy',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Survivor 50',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#f97316',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const content = (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" href="/favicon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <PWAUpdateNotification />
        <AdminDebugWrapper />
      </body>
    </html>
  )

  if (devBypass) return content
  return <ClerkProvider>{content}</ClerkProvider>
}
