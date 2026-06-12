# Pirxey Space Services

Interactive 3D space-game prototype inspired by Pirxey's visual identity and service positioning. The project combines a service-galaxy exploration mode with a wave-defense battle loop: the player flies a ship, visits service planets, docks to inspect service briefs, buys weapons, and protects the planets from hostile alien lifeforms.

## Stack

- React 18
- Vite
- TypeScript
- Three.js
- Tailwind CSS
- WebAudio API
- PWA manifest and service worker

## Running Locally

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Default dev server URL:

```text
http://127.0.0.1:5173/
```

To test on a phone connected to the same network, run Vite with a public host:

```bash
npx vite --host 0.0.0.0
```

Production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Core Game Loop

1. The page opens with a space-bugs invasion prompt.
2. The player can start the defense battle or enter exploration mode first.
3. In exploration mode, the player flies between Pirxey service planets and docks to read service descriptions.
4. In battle mode, endless waves of enemies attack the service planets.
5. Each wave is preceded by a `Next round` countdown.
6. Surviving planets restore HP at the start of each round.
7. Destroyed planets explode and do not return during the current match.
8. Game over happens when the player's ship is destroyed or all planets are lost.

## Gameplay Features

- Real-time 3D space scene with orbital paths, a central star, service planets, and the player's ship.
- Manual flight, autopilot, docking, and a mouse-aim camera mode.
- Enemy waves attacking one or multiple planets.
- Enemy movement avoids planets and the sun, with separation logic to reduce clustering.
- A Death Star-style boss appears from wave 5, chases the player, and fires from multiple guns.
- Planets have individual HP, and the player ship has HP with hit feedback.
- Match restart and exploration fallback are available after game over.
- Pause stops the active simulation.
- Mobile touch controls support forward thrust, nitro, braking, primary fire, secondary fire, and evasive rolls.
- PWA metadata enables install-style behavior when hosted over HTTPS.

## Weapons

The player starts with `Scout Bolts`, which have unlimited ammo. Purchased weapons use limited ammo and must be reloaded at planetary armories.

Primary weapons:

- `Pulse Laser` - a fast, precise laser.
- `Twin Cannons` - two side-mounted firing lanes.
- `Star Spiral Laser` - a rotating helix of laser energy around the firing axis.
- `Rapid Repeater` - a high-fire-rate weapon for close-sector defense.

Secondary weapons:

- `Homing Missiles` - missiles that look for the nearest target in the firing direction.
- `Plasma Orb` - an area-damage plasma projectile.
- `Arc Pulse` - an electric pulse around the player ship.

## Controls

- `W` - thrust.
- `Shift` - boost.
- `A` / `D` - yaw.
- `ArrowUp` / `ArrowDown` - pitch.
- `Space` / `C` - ascend / descend.
- `Q` / `E` - battle evasive roll.
- `F` or left mouse button - continuous primary fire.
- `G` or right mouse button - secondary fire.
- `R` - dock in exploration mode, or buy/reload a weapon near a planet in battle mode.
- Camera mode button / `V` - switch between drag camera and mouse aim.

## Audio

The project uses the WebAudio API and local WAV samples for:

- laser shots,
- enemy ship explosions,
- missile launches,
- plasma attacks,
- battle music loaded from the `soundtrack/` folder.

License details and attribution are documented in [docs/audio-attribution.md](docs/audio-attribution.md).

## Project Structure

```text
src/components/SpaceExperience.tsx  # main React scene and runtime integration
src/game/audio.ts                   # WebAudio, samples, soundtrack effects
src/game/factories.ts               # 3D factories for ships, projectiles, enemies, effects
src/game/types.ts                   # shared runtime types
src/game/waves.ts                   # wave configuration and spawning rules
src/game/weapons.ts                 # weapon catalog, pricing, ammo, planet offers
src/game/textures.ts                # procedural textures and glow sprites
src/game/math.ts                    # math helpers
src/data/services.ts                # Pirxey service planets
docs/space-defense-plan.md          # original game expansion plan
docs/wave-roadmap.md                # wave escalation roadmap
docs/audio-attribution.md           # audio attribution and licenses
```

## Status

This is a playable vertical slice built around a single map. Current priorities are combat balance, mobile ergonomics, UI readability, audio-visual feedback, wave performance, additional enemy types, and future roguelike upgrade choices.
