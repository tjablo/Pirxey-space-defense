# Pirxey Space Defense Plan

## Goal

Turn the 3D service-galaxy mockup into a playable vertical slice: one map, enemy waves, planet defense, player ship combat, and simple group aggro behavior.

## First-Version Rules

- The game uses one map: the Pirxey service-planet system.
- The player flies a ship and can use autopilot toward the selected planet.
- Enemies spawn in waves with no final round limit.
- Each wave chooses one or more target planets.
- When the player attacks a hostile raiding a planet, a small randomized subset of nearby raiders can switch aggro to the player.
- Enemies start with one slow attack type: a single projectile.
- The attack system should be ready for future patterns: burst fire, wave/sine movement, multi-shot volleys, and faster cooldowns every few waves.
- The first priority is clear combat, not itemization.

## Target Code Split

- `src/components/SpaceExperience.tsx` - React layer, UI, scene lifecycle, and system wiring.
- `src/game/types.ts` - shared runtime types for planets, enemies, projectiles, waves, and telemetry.
- `src/game/math.ts` - clamps, deterministic random helpers, color helpers, and format utilities.
- `src/game/textures.ts` - procedural planet, sun, and glow-sprite textures.
- `src/game/factories.ts` - factories for ships, cannons, enemies, projectiles, orbits, stars, and effects.
- `src/game/waves.ts` - wave configuration and future attack-pattern hooks.
- `src/game/weapons.ts` - weapon definitions, ammo capacities, prices, and planet armory offers.
- `src/game/audio.ts` - WebAudio playback, sample preloading, and battle soundtrack handling.

## Controls

- `W` / `Shift` - thrust / boost.
- `A` / `D` - yaw.
- `ArrowUp` / `ArrowDown` - pitch.
- `Space` / `C` - ascend / descend.
- `F` or left mouse button - primary fire.
- `G` or right mouse button - secondary fire.
- `Q` / `E` - evasive roll in battle.
- `R` - dock near a planet in exploration, or buy/reload a weapon at a nearby armory in battle.
- Mouse drag - camera/ship look.
- `V` - toggle camera mode.

## Phase 1

- Split the large scene file into scalable game modules.
- Add player cannons and projectiles.
- Add one hostile type: a space bug / raider.
- Add waves, round counter, and planet targets.
- Add slow enemy projectiles.
- Add planet HP, enemy kills, and group aggro after hits.

## Implemented Since Phase 1

- Player HP, ship destruction, and game-over flow.
- Planet destruction with explosions and permanent loss during a match.
- Restart and exploration fallback after game over.
- Death Star-style boss from wave 5.
- Multiple weapons with ammo, reloads, and planet armories.
- Sound effects, battle soundtrack, mute control, and audio attribution.
- Mobile touch controls and safe-area handling for iPhone-style screens.
- PWA manifest, install metadata, and a production-only service worker.
- Runtime warmup for audio and common 3D materials to reduce first-use stutter.

## Next Steps

- Roguelike item choices and upgrade builds.
- Additional enemy archetypes.
- True burst-fire attack patterns.
- Sine-wave projectile trajectories.
- Ramming enemies that threaten planet HP directly.
- XP/drop rewards and upgrade selection after rounds.
- Further map-size, speed, projectile-readability, and mobile-control balancing.
