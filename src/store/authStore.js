import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  hotel: null,
  loading: true,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      await get().loadProfile(session.user)
    }
    set({ loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await get().loadProfile(session.user)
      } else {
        set({ user: null, profile: null, hotel: null })
      }
    })
  },

  loadProfile: async (user) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*, hotels(*)')
      .eq('id', user.id)
      .single()

    set({
      user,
      profile,
      hotel: profile?.hotels ?? null,
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, hotel: null })
  },
}))
