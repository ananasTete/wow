import { create } from "zustand";

interface AboutState {
  keyword: string;
  setKeyword: (keyword: string) => void;
}

export const useAboutStore = create<AboutState>((set) => ({
  keyword: "",
  setKeyword: (keyword) => set({ keyword }),
}));
