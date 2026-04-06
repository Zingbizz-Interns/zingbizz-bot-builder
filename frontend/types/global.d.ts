type LenisInstance = {
  scrollTo: (target: string | Element, options?: { offset?: number; duration?: number }) => void
  on: (event: string, callback: (...args: unknown[]) => void) => void
  raf: (time: number) => void
  destroy: () => void
}

declare global {
  interface Window {
    lenis?: LenisInstance;
  }
}

export {};
