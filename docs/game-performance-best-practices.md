# Game Performance Best Practices

## Purpose

Keep Pirxey Space responsive during cold start, countdowns, wave transitions, combat spikes, hits, and explosions. New gameplay should preserve the same player-facing behavior while spreading expensive work across frames whenever possible.

## Core Rules

- Do not add work to the main animation loop without a clear budget.
- Do not create large batches of enemies, effects, projectiles, materials, or lights in one frame.
- Do not hide renderable objects only with opacity or zero intensity if they can be fully disabled with `visible = false`.
- Do not call GPU readback APIs such as `readPixels` from the normal game loop.
- Prefer object reuse, staging, pooling, and squared-distance math in hot paths.
- Validate performance-sensitive changes in a production build, not only during local development.

## Wave And Spawn Rules

- Use the countdown phase to stage the next wave incrementally.
- Keep staged enemies outside active gameplay arrays until activation.
- Apply a small per-frame time budget for wave staging so the countdown remains smooth.
- Reposition staged enemies at activation time, because planets and targets may have moved while staging was happening.
- If staging is not complete when the countdown reaches zero, hold the wave at zero briefly instead of spawning everything in a single expensive frame.
- Avoid increasing enemy counts, boss counts, or simultaneous target groups without checking the first affected wave and at least one later wave.

## Combat Hot Path Rules

- Use `distanceToSquared()` plus a squared threshold instead of `distanceTo()` inside projectile, enemy, or hit loops.
- Avoid `includes`, `filter`, `map`, `sort`, object spreading, and array cloning inside per-frame combat loops unless the collection is known to be tiny.
- Track local removal flags when iterating mutable projectile or enemy arrays.
- Trigger expensive group behavior, such as aggro propagation, only on state transitions instead of every hit.
- Reuse temporary `Vector3`, `Quaternion`, and color objects in repeated calculations.

## Hits And Explosions

- Keep hit flashes, shields, glows, and lights invisible until they are actually active.
- Avoid creating a dynamic `PointLight` for every explosion. Prefer emissive meshes, sprites, particles, or pooled lights with a strict cap.
- Pool effects that can appear in bursts, especially projectiles, explosions, impact flashes, and debris.
- Dispose geometries, materials, textures, and audio nodes only when ownership is clear and the object will not be reused.
- First shot, first hit, first explosion, boss death, and planet destruction should be tested after every effect-related change.

## Three.js And WebGL Rules

- Keep `preserveDrawingBuffer` disabled during normal gameplay.
- Keep renderer pixel ratio capped and consider adaptive quality if frame time spikes on mobile.
- Watch `renderer.info.render.calls`, active lights, geometries, textures, and triangle counts when changing render code.
- Warm up runtime materials, shaders, audio samples, and first-use effects before combat when practical.
- Treat debug visualization and telemetry as opt-in. Debug helpers should not run automatically every frame.

## React And UI Rules

- Do not push React state updates from every animation frame unless the value changed and the UI needs it.
- Throttle HUD, telemetry, and debug panel updates.
- Keep battle overlays visually clear but cheap: avoid unnecessary `backdrop-filter`, large animated shadows, and constantly animating layout-heavy elements.
- Avoid remounting large UI branches during countdown, wave start, or game over unless the user-visible state requires it.

## Asset And Audio Rules

- Preload and decode commonly used sound effects before combat starts.
- Avoid starting large asset downloads at the same moment as the first wave.
- Keep soundtrack preload and playback startup separate from combat-critical initialization when possible.
- Prefer shared textures, shared geometries, and instancing for repeated visual elements.

## Review Checklist

Before merging a performance-sensitive change, answer these questions:

- Does this allocate objects inside the animation loop?
- Does this create materials, geometries, textures, audio nodes, enemies, or lights during a combat spike?
- Does this add an O(projectiles * enemies), O(enemies * enemies), or similar nested loop?
- Does this use square roots, normalization, cloning, or array searches inside a hot loop?
- Does this change wave counts, spawn timing, explosions, projectiles, boss behavior, or planet damage?
- Is any debug-only work still running automatically in production gameplay?
- Has the first wave and a later, denser wave been smoke-tested?

## Examples

Bad:

```ts
const distance = projectile.mesh.position.distanceTo(enemy.group.position);
if (distance < hitRadius) {
  damageEnemy(enemy);
}
```

Good:

```ts
const hitRadiusSq = hitRadius * hitRadius;
const distanceSq = projectile.mesh.position.distanceToSquared(enemy.group.position);
if (distanceSq < hitRadiusSq) {
  damageEnemy(enemy);
}
```

Bad:

```ts
hitLight.intensity = 0;
hitShield.material.opacity = 0;
```

Good:

```ts
hitLight.visible = false;
hitShield.visible = false;
```

Bad:

```ts
for (const spawn of wave.spawns) {
  enemies.push(createEnemy(spawn));
}
```

Good:

```ts
// Stage enemies during countdown using a small per-frame time budget.
// Activate them together only after the objects are already created.
```

## Required Verification

- Run `npm run build`.
- Start the game from a fresh page load and verify countdown to wave 1.
- Check the first shot, first enemy hit, first explosion, and first planet damage event.
- Test at least one later wave when wave spawning, enemy counts, projectile behavior, or effects changed.
- Check the browser console for errors.
- Inspect runtime stats or debug telemetry when changing render paths, effects, or enemy counts.
