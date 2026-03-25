'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/lib/actions/auth'
import Button from '@/components/ui/Button'

export default function SignUpPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    if (formData.get('password') !== formData.get('confirm')) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const result = await signUp(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="border-4 border-[#121212] shadow-[8px_8px_0px_0px_#121212] bg-white">
      {/* Header band */}
      <div className="bg-[#D02020] px-7 py-5 flex items-center justify-between">
        <h2 className="text-xl font-black uppercase tracking-tighter text-white">Create Account</h2>
        <div className="w-3 h-3 bg-[#F0C020] border-2 border-white" />
      </div>

      <div className="p-7 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
              Full Name
            </label>
            <input
              name="name"
              type="text"
              required
              placeholder="John Doe"
              className="w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium text-[#121212] placeholder:text-[#121212]/40 focus:outline-none focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium text-[#121212] placeholder:text-[#121212]/40 focus:outline-none focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
              Password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Min. 6 characters"
              className="w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium text-[#121212] placeholder:text-[#121212]/40 focus:outline-none focus:bg-white transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-[#121212] mb-1.5">
              Confirm Password
            </label>
            <input
              name="confirm"
              type="password"
              required
              placeholder="Repeat password"
              className="w-full px-3 py-2.5 border-2 border-[#121212] bg-[#F0F0F0] text-sm font-medium text-[#121212] placeholder:text-[#121212]/40 focus:outline-none focus:bg-white transition-colors"
            />
          </div>

          {error && (
            <div className="border-2 border-[#D02020] bg-[#D02020]/10 px-3 py-2.5">
              <p className="text-sm font-medium text-[#D02020]">{error}</p>
            </div>
          )}

          <Button variant="red" fullWidth disabled={loading} type="submit">
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div className="border-t-2 border-[#E0E0E0] pt-4">
          <p className="text-sm font-medium text-[#121212]/60 text-center">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-[#1040C0] hover:text-[#D02020] transition-colors uppercase tracking-wide text-xs">
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
