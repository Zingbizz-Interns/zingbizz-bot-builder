const { supabase } = require('../config/supabase')

/**
 * Express middleware — validates Supabase JWT from Authorization header.
 * Attaches user and customer_profile to req on success.
 *
 * Usage: router.get('/protected', requireAuth, handler)
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' })
  }

  const token = authHeader.replace('Bearer ', '')

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  // Fetch customer profile
  const { data: profile, error: profileError } = await supabase
    .from('customer_profiles')
    .select('id, name, email')
    .eq('user_id', user.id)
    .single()

  if (profileError || !profile) {
    return res.status(401).json({ error: 'Customer profile not found' })
  }

  req.user = user
  req.customerId = profile.id
  req.customerProfile = profile

  next()
}

module.exports = { requireAuth }
