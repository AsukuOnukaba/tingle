import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ProfileState {
  currentProfileId: string | null;
  setCurrentProfileId: (id: string) => void;
}

export const useCurrentProfile = create<ProfileState>()(
  persist(
    (set) => ({
      currentProfileId: null,
      setCurrentProfileId: (id: string) => set({ currentProfileId: id }),
    }),
    {
      name: 'current-profile-storage',
    }
  )
);
