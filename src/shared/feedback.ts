import { useEffect } from 'react'

let ctx: AudioContext | null = null

/** Short synthesized tones - no audio files, so they work offline. */
export function beep(kind: 'point' | 'win') {
  try {
    ctx ??= new AudioContext()
    const notes = kind === 'win' ? [660, 880, 1100] : [880]
    notes.forEach((freq, i) => {
      const osc = ctx!.createOscillator()
      const gain = ctx!.createGain()
      const t = ctx!.currentTime + i * 0.12
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
      osc.connect(gain).connect(ctx!.destination)
      osc.start(t)
      osc.stop(t + 0.12)
    })
  } catch {
    /* audio unavailable */
  }
}

export function announce(text: string) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.rate = 1.05
  speechSynthesis.speak(u)
}

/** Keep the screen awake while scoring (re-acquired when the tab becomes visible again). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    const acquire = () => {
      if (document.visibilityState === 'visible') navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => {})
    }
    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      document.removeEventListener('visibilitychange', acquire)
      lock?.release().catch(() => {})
    }
  }, [active])
}
