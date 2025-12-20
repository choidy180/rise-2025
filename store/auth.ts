// /store/auth.ts
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

type AuthState = {
  status: "unauth" | "auth";
  user?: { id: string; name: string;} | null;
  login: (user: AuthState["user"]) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      status: "unauth",
      user: null,
      login: (user) => set({ status: "auth", user }),
      logout: () => set({ status: "unauth", user: null }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({status: state.status, user: state.user}),
    }
  )
)
