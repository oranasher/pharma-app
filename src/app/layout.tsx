import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { FirebaseClientProvider } from '@/firebase';
import { PT_Sans } from 'next/font/google';
import { ThemeProvider } from '@/components/theme-provider';
import { ProductionSafeguards } from '@/components/production-safeguards';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'PharmaRisk | AI Control Center',
  description: 'Strategic risk management and AI-powered mission control for pharmaceutical validation operations.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 256 256%22><rect width=%22256%22 height=%22256%22 rx=%2260%22 fill=%22%2300fff2%22/><path fill=%22%23050b18%22 d=%22M208 40H48a16 16 0 0 0-16 16v144a16 16 0 0 0 16 16h160a16 16 0 0 0 16-16V56a16 16 0 0 0-16-16Zm-29.6 120a48 48 0 0 1-84.8-33.92V88h24v38.08a24 24 0 0 0 42.4 17Z%22/></svg>',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Preload High-End Sci-Fi Assets & Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="preload" href="/globals.css" as="style" />
      </head>
      <body className={cn('min-h-screen bg-background font-sans antialiased', ptSans.variable)}>
        <ProductionSafeguards />
        <ThemeProvider
          attribute="data-theme"
          defaultTheme="aurora-glass"
          enableSystem={false}
          disableTransitionOnChange
          themes={['light-professional', 'aurora-glass', 'clean-slate', 'vibrant', 'neon-party']}
        >
          <FirebaseClientProvider>
            {children}
            <Toaster />
          </FirebaseClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
