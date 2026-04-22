'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from '@/lib/actions/auth'
import Button from '@/components/ui/Button'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const result = await signIn(new FormData(e.currentTarget))
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="border-4 border-black shadow-[8px_8px_0px_0px_#000] bg-[#FFFDF5]">
      {/* Header band */}
      <div className="bg-black px-7 py-5 flex items-center justify-between border-b-4 border-black">
        <h2 className="text-xl font-black uppercase tracking-tighter text-white">Sign In</h2>
        <div className="w-4 h-4 bg-[#FFD93D] border-2 border-white" />
      </div>

      <div className="p-7 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-black mb-2">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 border-4 border-black bg-white text-sm font-bold text-black placeholder:text-black/30 focus:outline-none focus:bg-[#FFD93D] transition-colors duration-100 h-14"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-black mb-2">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              placeholder="Your password"
              className="w-full px-4 py-3 border-4 border-black bg-white text-sm font-bold text-black placeholder:text-black/30 focus:outline-none focus:bg-[#FFD93D] transition-colors duration-100 h-14"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="border-4 border-[#FF6B6B] bg-[#FF6B6B]/10 px-4 py-3">
              <p className="text-sm font-bold text-black">{error}</p>
            </div>
          )}

          <Button variant="red" fullWidth disabled={loading} type="submit" className="h-14 text-base">
            {loading ? 'Signing in...' : 'Sign In →'}
          </Button>
        </form>

        <div className="border-t-4 border-black pt-5">
          <p className="text-sm font-bold text-black/60 text-center uppercase tracking-wide">
            No account?{' '}
            <Link
              href="/signup"
              className="text-black underline underline-offset-4 hover:text-[#FF6B6B] transition-colors font-black"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
