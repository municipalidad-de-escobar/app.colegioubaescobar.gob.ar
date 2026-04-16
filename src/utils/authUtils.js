import { supabase } from '../config/supabase'

export const checkAdminWhitelist = async (email) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return data || null
  } catch (error) {
    console.error('Error verificando whitelist:', error)
    throw error
  }
}

export const getUserRole = async (email) => {
  const adminData = await checkAdminWhitelist(email)
  if (adminData) {
    return adminData.role || 'admin'
  }
  return null
}
