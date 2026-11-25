import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface CookingTimer {
  id: string;
  label: string;
  recipeTitle: string;
  stepIndex: number;
  durationSeconds: number;
  remainingSeconds: number;
  endAt: number | null;
  paused: boolean;
  completed: boolean;
  notificationId: string | null;
}

interface TimerState {
  timers: CookingTimer[];
  startTimer: (timer: Omit<CookingTimer, 'id' | 'remainingSeconds' | 'endAt' | 'paused' | 'completed' | 'notificationId'>) => void;
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  resetTimer: (id: string) => void;
  addTime: (id: string, seconds: number) => void;
  removeTimer: (id: string) => void;
  tick: () => CookingTimer[];
  setNotificationId: (id: string, notificationId: string | null) => void;
}

const timerStorage = createJSONStorage<TimerState>(() => ({
  getItem: async (key: string) => {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
}));

function remaining(timer: CookingTimer, now = Date.now()) {
  if (timer.paused || timer.completed || timer.endAt === null) return timer.remainingSeconds;
  return Math.max(0, Math.ceil((timer.endAt - now) / 1000));
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      timers: [],

      startTimer: (timer) => {
        const now = Date.now();
        set((state) => ({
          timers: [
            ...state.timers,
            {
              ...timer,
              id: `${now}-${state.timers.length}-${timer.stepIndex}`,
              remainingSeconds: timer.durationSeconds,
              endAt: now + timer.durationSeconds * 1000,
              paused: false,
              completed: false,
              notificationId: null,
            },
          ],
        }));
      },

      pauseTimer: (id) => {
        set((state) => ({
          timers: state.timers.map((timer) =>
            timer.id === id && !timer.completed
              ? { ...timer, remainingSeconds: remaining(timer), endAt: null, paused: true }
              : timer
          ),
        }));
      },

      resumeTimer: (id) => {
        set((state) => ({
          timers: state.timers.map((timer) =>
            timer.id === id && timer.paused
              ? { ...timer, endAt: Date.now() + timer.remainingSeconds * 1000, paused: false }
              : timer
          ),
        }));
      },

      resetTimer: (id) => {
        set((state) => ({
          timers: state.timers.map((timer) =>
            timer.id === id
              ? {
                  ...timer,
                  remainingSeconds: timer.durationSeconds,
                  endAt: Date.now() + timer.durationSeconds * 1000,
                  paused: false,
                  completed: false,
                  notificationId: null,
                }
              : timer
          ),
        }));
      },

      addTime: (id, seconds) => {
        set((state) => ({
          timers: state.timers.map((timer) => {
            if (timer.id !== id) return timer;
            if (timer.completed) {
              return {
                ...timer,
                remainingSeconds: seconds,
                endAt: Date.now() + seconds * 1000,
                paused: false,
                completed: false,
                notificationId: null,
              };
            }
            if (timer.paused) {
              return { ...timer, remainingSeconds: timer.remainingSeconds + seconds };
            }
            return {
              ...timer,
              endAt: (timer.endAt ?? Date.now()) + seconds * 1000,
            };
          }),
        }));
      },

      removeTimer: (id) => set((state) => ({
        timers: state.timers.filter((timer) => timer.id !== id),
      })),

      tick: () => {
        const newlyCompleted: CookingTimer[] = [];
        set((state) => ({
          timers: state.timers.map((timer) => {
            if (timer.completed || timer.paused || timer.endAt === null) return timer;
            const remainingSeconds = remaining(timer);
            if (remainingSeconds <= 0) {
              const completed = { ...timer, remainingSeconds: 0, endAt: null, completed: true };
              newlyCompleted.push(completed);
              return completed;
            }
            return { ...timer, remainingSeconds };
          }),
        }));
        return newlyCompleted;
      },

      setNotificationId: (id, notificationId) => set((state) => ({
        timers: state.timers.map((timer) =>
          timer.id === id ? { ...timer, notificationId } : timer
        ),
      })),
    }),
    {
      name: 'cut-the-crap-timers',
      storage: timerStorage,
      partialize: (state) => ({ timers: state.timers }) as unknown as TimerState,
      version: 1,
    }
  )
);
