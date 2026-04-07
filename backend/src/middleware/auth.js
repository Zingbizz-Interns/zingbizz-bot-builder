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

  // Customer owner flow
  const { data: profile, error: profileError } = await supabase
    .from('customer_profiles')
    .select('id, name, email')
    .eq('user_id', user.id)
    .single()

  if (!profileError && profile) {
    req.user = user
    req.customerId = profile.id
    req.customerProfile = profile
    req.actor = {
      type: 'customer',
      id: profile.id,
      authUserId: user.id,
      name: profile.name || user.user_metadata?.name || user.email,
      email: profile.email || user.email,
      canEdit: true,
    }
    return next()
  }

  // Sub-account flow
  const { data: subAccount, error: subError } = await supabase
    .from('sub_accounts')
    .select('id, customer_id, name, email')
    .eq('user_id', user.id)
    .single()

  if (subError || !subAccount) {
    return res.status(401).json({ error: 'Customer profile not found' })
  }

  req.user = user
  req.customerId = subAccount.customer_id
  req.subAccount = subAccount
  req.actor = {
    type: 'sub_account',
    id: subAccount.id,
    authUserId: user.id,
    name: subAccount.name || user.user_metadata?.name || user.email,
    email: subAccount.email || user.email,
    canEdit: false,
  }

  next()
}

module.exports = { requireAuth }
