import type { Metadata } from 'next'
import 'lenis/dist/lenis.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'BotBuilder — WhatsApp & Instagram Chatbot Platform',
  description: 'Build and manage WhatsApp and Instagram chatbots without code.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
