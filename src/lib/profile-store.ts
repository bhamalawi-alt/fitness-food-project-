'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ActivityLevel, Gender, Goal } from './calories'

export interface WeightLogEntry {
  /** ISO date (YYYY-MM-DD) */
  date: string
  weightKg: number
}

/** The customer profile created during the mobile app onboarding. */
export interface UserProfile {
  name: string
  phone: string
  gender: Gender
  age: number
  heightCm: number
  /** current weight — updated when the client logs a new weigh-in */
  weightKg: number
  /** weight when onboarding finished — anchor for progress */
  startWeightKg: number
  /** goal weight, null when maintaining */
  targetWeightKg: number | null
  activity: ActivityLevel
  goal: Goal
  onboardedAt: string
  weightLog: WeightLogEntry[]
}

/** Payload used both by onboarding (full setup) and profile edits. */
export type ProfileDraft = Omit<UserProfile, 'onboardedAt' | 'weightLog' | 'startWeightKg'>

interface ProfileState {
  profile: UserProfile | null
  /** Finish onboarding: persists the profile and stamps the start weight. */
  completeOnboarding: (draft: ProfileDraft) => void
  /** Patch individual fields (profile screen edits). */
  updateProfile: (patch: Partial<UserProfile>) => void
  /** Log a weigh-in: appends to the log and updates current weight. */
  logWeight: (weightKg: number) => void
  /** Wipe the profile — returns the user to onboarding. */
  resetProfile: () => void
}

export const useProfile = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      completeOnboarding: (draft) =>
        set(() => ({
          profile: {
            ...draft,
            startWeightKg: draft.weightKg,
            onboardedAt: new Date().toISOString(),
            weightLog: [{ date: new Date().toISOString().slice(0, 10), weightKg: draft.weightKg }],
          },
        })),
      updateProfile: (patch) =>
        set((s) => (s.profile ? { profile: { ...s.profile, ...patch } } : {})),
      logWeight: (weightKg) =>
        set((s) => {
          if (!s.profile) return {}
          const today = new Date().toISOString().slice(0, 10)
          const log = [...s.profile.weightLog.filter((e) => e.date !== today), { date: today, weightKg }]
          return { profile: { ...s.profile, weightKg, weightLog: log.sort((a, b) => a.date.localeCompare(b.date)) } }
        }),
      resetProfile: () => set({ profile: null }),
    }),
    { name: 'fitfuel-app-profile' }
  )
)

/**
 * Progress toward the goal weight (0 → just started, 1 → reached).
 * Returns null when maintaining (no target) or when the target equals start.
 */
export function goalProgress(p: UserProfile): number | null {
  if (p.targetWeightKg == null) return null
  const total = p.startWeightKg - p.targetWeightKg
  if (Math.abs(total) < 0.1) return null
  const done = p.startWeightKg - p.weightKg
  return Math.max(0, Math.min(1, done / total))
}
