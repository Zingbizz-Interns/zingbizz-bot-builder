const { supabase } = require('../config/supabase')

async function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const { data: appAdmin, error } = await supabase
    .from('app_admins')
    .select('user_id, email, label, created_at')
    .eq('user_id', req.user.id)
    .single()

  if (error || !appAdmin) {
    return res.status(403).json({ error: 'Super admin access required' })
  }

  req.appAdmin = appAdmin
  next()
}

module.exports = { requireSuperAdmin }
