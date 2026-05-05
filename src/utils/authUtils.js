import { db } from '../config/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export const checkAdminWhitelist = async (email) => {
  try {
    const q = query(collection(db, 'admins'), where('email', '==', email))
    const snapshot = await getDocs(q)
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0]
      return { id: docSnap.id, ...docSnap.data() }
    }
    return null
  } catch (error) {
    console.error('Error verificando whitelist:', error)
    throw error
  }
}

export const getUserRole = async (email) => {
  const adminData = await checkAdminWhitelist(email)
  return adminData?.role || null
}
