import { create } from 'zustand';

interface BadgeStore {
  artistPending: number;
  customerPending: number;
  messageUnread: number;
  setArtistPending: (n: number) => void;
  setCustomerPending: (n: number) => void;
  setMessageUnread: (n: number) => void;
  reset: () => void;
}

export const useBadgeStore = create<BadgeStore>((set) => ({
  artistPending: 0,
  customerPending: 0,
  messageUnread: 0,
  setArtistPending: (n) => set({ artistPending: n }),
  setCustomerPending: (n) => set({ customerPending: n }),
  setMessageUnread: (n) => set({ messageUnread: n }),
  reset: () => set({ artistPending: 0, customerPending: 0, messageUnread: 0 }),
}));
