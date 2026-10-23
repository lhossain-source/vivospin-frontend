type SoundName = "tap" | "gem" | "mine" | "win" | "crash" | "cascade" | "flight";

let audioContext: AudioContext | null = null;

export function playGameSound(name: SoundName, enabled = true): void {
  if (!enabled || typeof window === "undefined") return;
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
    const ctx = audioContext;
    const notes: Record<SoundName, number[]> = {
      tap: [520],
      gem: [720, 1080],
      mine: [150, 85],
      win: [660, 830, 990, 1320],
      crash: [260, 115],
      cascade: [540, 680, 820],
      flight: [360, 520],
    };
    notes[name].forEach((frequency, index) => {
      const start = ctx.currentTime + index * (name === "win" ? 0.085 : 0.06);
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = name === "mine" || name === "crash" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(name === "win" ? 0.045 : 0.03, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (name === "crash" ? 0.32 : 0.18));
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.35);
    });
  } catch {
    // Sound is an enhancement; unsupported audio must never break gameplay.
  }
}
