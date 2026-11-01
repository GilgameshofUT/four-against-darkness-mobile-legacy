import { create } from 'zustand'

export type TabId = 'party' | 'dungeon' | 'combat' | 'tables' | 'more'

interface UiState {
  tab: TabId
  setTab: (tab: TabId) => void
}

export const useUi = create<UiState>((set) => ({
  tab: 'party',
  setTab: (tab) => set({ tab }),
}))
