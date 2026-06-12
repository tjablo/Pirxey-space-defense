import enemyExplosionUrl from "../assets/audio/morganpurkis-space-explosion.wav";
import fusionFlashUrl from "../assets/audio/onlytheghosts-fusion-gun-flash.wav";
import laserShotUrl from "../assets/audio/tannersound-laser-shot.wav";
import missileLaunchUrl from "../assets/audio/robinhood76-space-missile.wav";

export type GameAudio = {
  explosion: () => void;
  isMuted: () => boolean;
  missile: () => void;
  planetExplosion: () => void;
  plasma: () => void;
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
  let laserShotBuffer: AudioBuffer | null = null;
  let laserShotLoad: Promise<AudioBuffer | null> | null = null;
  let enemyExplosionBuffer: AudioBuffer | null = null;
  let enemyExplosionLoad: Promise<AudioBuffer | null> | null = null;
  let missileLaunchBuffer: AudioBuffer | null = null;
  let missileLaunchLoad: Promise<AudioBuffer | null> | null = null;
  let fusionFlashBuffer: AudioBuffer | null = null;
  let fusionFlashLoad: Promise<AudioBuffer | null> | null = null;

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

  const syntheticShoot = () => {
    tone(1480, 0.12, "sawtooth", 0.028, -1120);
    tone(920, 0.09, "square", 0.018, -610);
    tone(2600, 0.035, "triangle", 0.012, -1500);
  };

  const syntheticExplosion = () => {
    tone(140, 0.22, "sawtooth", 0.08, -90);
    tone(62, 0.28, "triangle", 0.06, -28);
  };

  const syntheticMissile = () => {
    tone(360, 0.46, "sawtooth", 0.04, -180);
    tone(780, 0.22, "triangle", 0.026, -420);
    tone(92, 0.38, "sine", 0.032, -26);
  };

  const syntheticPlasma = () => {
    tone(760, 0.22, "sawtooth", 0.034, -420);
    tone(1860, 0.16, "triangle", 0.022, -980);
    tone(120, 0.38, "sine", 0.024, -34);
  };

  const loadAudioBuffer = (
    url: string,
    setLoad: (load: Promise<AudioBuffer | null> | null) => void,
    setBuffer: (buffer: AudioBuffer) => void
  ) => {
    const ctx = getContext();
    return fetch(url)
      .then((response) => response.arrayBuffer())
      .then((buffer) => ctx.decodeAudioData(buffer))
      .then((buffer) => {
        setBuffer(buffer);
        return buffer;
      })
      .catch(() => {
        setLoad(null);
        return null;
      });
  };

  const loadLaserShot = () => {
    if (!laserShotLoad) {
      laserShotLoad = loadAudioBuffer(
        laserShotUrl,
        (load) => {
          laserShotLoad = load;
        },
        (buffer) => {
          laserShotBuffer = buffer;
        }
      );
    }

    return laserShotLoad;
  };

  const loadEnemyExplosion = () => {
    if (!enemyExplosionLoad) {
      enemyExplosionLoad = loadAudioBuffer(
        enemyExplosionUrl,
        (load) => {
          enemyExplosionLoad = load;
        },
        (buffer) => {
          enemyExplosionBuffer = buffer;
        }
      );
    }

    return enemyExplosionLoad;
  };

  const loadMissileLaunch = () => {
    if (!missileLaunchLoad) {
      missileLaunchLoad = loadAudioBuffer(
        missileLaunchUrl,
        (load) => {
          missileLaunchLoad = load;
        },
        (buffer) => {
          missileLaunchBuffer = buffer;
        }
      );
    }

    return missileLaunchLoad;
  };

  const loadFusionFlash = () => {
    if (!fusionFlashLoad) {
      fusionFlashLoad = loadAudioBuffer(
        fusionFlashUrl,
        (load) => {
          fusionFlashLoad = load;
        },
        (buffer) => {
          fusionFlashBuffer = buffer;
        }
      );
    }

    return fusionFlashLoad;
  };

  const playLaserShot = () => {
    const buffer = laserShotBuffer;
    if (!buffer) {
      void loadLaserShot();
      syntheticShoot();
      return;
    }

    const ctx = getContext();
    const source = ctx.createBufferSource();
    const volume = ctx.createGain();
    const now = ctx.currentTime;
    source.buffer = buffer;
    source.playbackRate.value = 0.97 + Math.random() * 0.06;
    volume.gain.setValueAtTime(0.2, now);
    volume.gain.exponentialRampToValueAtTime(0.001, now + Math.min(buffer.duration, 0.42));
    source.connect(volume);
    volume.connect(getMasterGain());
    source.start(now);
    source.stop(now + buffer.duration);
  };

  const playEnemyExplosion = () => {
    const buffer = enemyExplosionBuffer;
    if (!buffer) {
      void loadEnemyExplosion();
      syntheticExplosion();
      return;
    }

    const ctx = getContext();
    const source = ctx.createBufferSource();
    const volume = ctx.createGain();
    const now = ctx.currentTime;
    source.buffer = buffer;
    source.playbackRate.value = 0.92 + Math.random() * 0.12;
    volume.gain.setValueAtTime(0.34, now);
    volume.gain.exponentialRampToValueAtTime(0.001, now + Math.min(buffer.duration, 0.78));
    source.connect(volume);
    volume.connect(getMasterGain());
    source.start(now);
    source.stop(now + buffer.duration);
  };

  const playMissileLaunch = () => {
    const buffer = missileLaunchBuffer;
    if (!buffer) {
      void loadMissileLaunch();
      syntheticMissile();
      return;
    }

    const ctx = getContext();
    const source = ctx.createBufferSource();
    const volume = ctx.createGain();
    const now = ctx.currentTime;
    source.buffer = buffer;
    source.playbackRate.value = 0.94 + Math.random() * 0.1;
    volume.gain.setValueAtTime(0.22, now);
    volume.gain.exponentialRampToValueAtTime(0.001, now + Math.min(buffer.duration, 1.25));
    source.connect(volume);
    volume.connect(getMasterGain());
    source.start(now);
    source.stop(now + buffer.duration);
  };

  const playFusionFlash = () => {
    const buffer = fusionFlashBuffer;
    if (!buffer) {
      void loadFusionFlash();
      syntheticPlasma();
      return;
    }

    const ctx = getContext();
    const source = ctx.createBufferSource();
    const volume = ctx.createGain();
    const now = ctx.currentTime;
    source.buffer = buffer;
    source.playbackRate.value = 0.96 + Math.random() * 0.08;
    volume.gain.setValueAtTime(0.24, now);
    volume.gain.exponentialRampToValueAtTime(0.001, now + Math.min(buffer.duration, 0.95));
    source.connect(volume);
    volume.connect(getMasterGain());
    source.start(now);
    source.stop(now + buffer.duration);
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
      playEnemyExplosion();
    },
    isMuted: () => muted,
    missile: () => {
      playMissileLaunch();
    },
    planetExplosion: () => {
      tone(96, 0.55, "sawtooth", 0.12, -58);
      tone(42, 0.7, "sine", 0.09, -12);
    },
    plasma: () => {
      playFusionFlash();
    },
    resume: () => {
      void getContext().resume();
      void loadLaserShot();
      void loadEnemyExplosion();
      void loadMissileLaunch();
      void loadFusionFlash();
    },
    setMuted: (nextMuted: boolean) => {
      muted = nextMuted;
      syncMute();
    },
    shoot: () => {
      playLaserShot();
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
