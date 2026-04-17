import { supabase } from '../config/supabase'

export const checkAdminWhitelist = async (email) => {
  try {
    console.log('Checking whitelist for:', email)
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single()

    if (error) {
      // PGRST116 = not found
      if (error.code === 'PGRST116') {
        console.log('Email not in whitelist')
        return null
      }
      // Other errors are real failures
      console.error('Whitelist query error:', error.code, error.message)
      throw error
    }

    console.log('Whitelist check passed:', data)
    return data || null
  } catch (error) {
    console.error('Error verificando whitelist:', error)
    return null
  }
}

export const getUserRole = async (email) => {
  const adminData = await checkAdminWhitelist(email)
  if (adminData) {
    return adminData.role || 'admin'
  }
  return null
}
