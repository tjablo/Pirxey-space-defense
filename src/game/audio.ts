export type GameAudio = {
  explosion: () => void;
  isMuted: () => boolean;
  planetExplosion: () => void;
  resume: () => void;
  setMuted: (muted: boolean) => void;
  shoot: () => void;
  startSoundtrack: (tracks: string[]) => void;
  stopSoundtrack: () => void;
};

export const createGameAudio = (): GameAudio => {
  let context: AudioContext | null = null;
  let masterGain: GainNode | null = null;
  let muted = false;
  let soundtrack: HTMLAudioElement | null = null;
  let playlist: string[] = [];
  let trackIndex = 0;

  const getContext = () => {
    if (!context) {
      context = new AudioContext();
    }
    return context;
  };

  const getMasterGain = () => {
    const ctx = getContext();
    if (!masterGain) {
      masterGain = ctx.createGain();
      masterGain.gain.value = muted ? 0 : 1;
      masterGain.connect(ctx.destination);
    }
    return masterGain;
  };

  const syncMute = () => {
    if (masterGain) {
      masterGain.gain.value = muted ? 0 : 1;
    }
    if (soundtrack) {
      soundtrack.muted = muted;
    }
  };

  const tone = (frequency: number, duration: number, type: OscillatorType, gain: number, slide = 0) => {
    const ctx = getContext();
    const oscillator = ctx.createOscillator();
    const volume = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (slide !== 0) {
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, frequency + slide), ctx.currentTime + duration);
    }
    volume.gain.setValueAtTime(gain, ctx.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(volume);
    volume.connect(getMasterGain());
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  };

  const playTrack = (index: number) => {
    if (playlist.length === 0) {
      return;
    }
    if (!soundtrack) {
      soundtrack = new Audio();
      soundtrack.preload = "auto";
      soundtrack.volume = 0.42;
      soundtrack.addEventListener("ended", () => playTrack(trackIndex + 1));
      soundtrack.addEventListener("error", () => window.setTimeout(() => playTrack(trackIndex + 1), 0));
    }

    trackIndex = ((index % playlist.length) + playlist.length) % playlist.length;
    soundtrack.loop = playlist.length === 1;
    soundtrack.muted = muted;
    soundtrack.src = playlist[trackIndex];
    soundtrack.currentTime = 0;
    void soundtrack.play().catch(() => {
      // Browsers can reject playback until the next trusted user gesture.
    });
  };

  return {
    explosion: () => {
      tone(140, 0.22, "sawtooth", 0.08, -90);
      tone(62, 0.28, "triangle", 0.06, -28);
    },
    isMuted: () => muted,
    planetExplosion: () => {
      tone(96, 0.55, "sawtooth", 0.12, -58);
      tone(42, 0.7, "sine", 0.09, -12);
    },
    resume: () => {
      void getContext().resume();
    },
    setMuted: (nextMuted: boolean) => {
      muted = nextMuted;
      syncMute();
    },
    shoot: () => {
      tone(1480, 0.12, "sawtooth", 0.028, -1120);
      tone(920, 0.09, "square", 0.018, -610);
      tone(2600, 0.035, "triangle", 0.012, -1500);
    },
    startSoundtrack: (tracks: string[]) => {
      if (tracks.length === 0) {
        return;
      }
      const nextPlaylist = [...tracks];
      const samePlaylist =
        playlist.length === nextPlaylist.length && playlist.every((track, index) => track === nextPlaylist[index]);
      playlist = nextPlaylist;

      if (!samePlaylist || !soundtrack?.src) {
        trackIndex = 0;
        playTrack(trackIndex);
        return;
      }

      if (soundtrack.paused) {
        soundtrack.muted = muted;
        void soundtrack.play().catch(() => {
          // Browsers can reject playback until the next trusted user gesture.
        });
      }
    },
    stopSoundtrack: () => {
      playlist = [];
      trackIndex = 0;
      if (soundtrack) {
        soundtrack.pause();
        soundtrack.currentTime = 0;
      }
    }
  };
};
