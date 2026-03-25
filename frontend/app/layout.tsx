import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'BotBuilder — WhatsApp & Instagram Chatbot Platform',
  description: 'Build and manage WhatsApp and Instagram chatbots without code.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} antialiased`}>
        {children}
      </body>
    </html>
  )
}
