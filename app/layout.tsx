import type {Metadata} from 'next';
import { Inter } from 'next/font/google';
import './globals.css'; // Global styles

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'Webcam FX Studio',
  description: 'Real-time webcam effects using WebGL with 50 different filters, photo capture, and video recording.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-zinc-950 text-white" suppressHydrationWarning>{children}</body>
    </html>
  );
}
