// services/supabase.js
// Creates and exports a Supabase admin client using the service role key.

const { createClient } = require('@supabase/supabase-js');
const { supabaseUrl, supabaseServiceKey } = require('../config/env');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

module.exports = supabase;
