# Alien Lifeform Wave Escalation Roadmap

## Persistent Rules

- The game starts only after the player confirms the invasion prompt.
- Before each round, the UI shows `Next round` with a countdown.
- At the start of each round, every surviving planet restores HP to 100%.
- Destroyed planets explode and do not return in later rounds.
- If all planets are destroyed, the match enters game over.
- Waves are endless; after wave 20, enemy count, HP, and attack frequency scale mathematically.

## Current Wave Schedule

- Waves 1-2: one group attacks one planet with slow single-shot projectiles.
- Waves 3-4: two groups can attack two different planets, still using single-shot projectiles.
- Wave 5: the Death Star-style boss can appear; enemies gain more pressure and durability.
- Wave 6: the `burst-ready` pattern is active in configuration. The current implementation still fires single shots, but the system is prepared for burst logic.
- Waves 7-8: two or three planets can be attacked at the same time.
- Wave 9: the `wave-ready` pattern is active. Future projectiles can use sine-wave movement.
- Wave 10: first major pressure spike: more enemies and shorter attack cooldowns.
- Waves 11-14: enemy speed, HP, and attack cadence continue scaling.
- Wave 15: target milestone for a heavier escort group or additional mini-boss behavior.
- Waves 16-19: more parallel groups and faster projectiles.
- Wave 20: late-game threshold; later waves scale without a hard cap.

## Planned Extensions

- Real burst fire: several shots in short intervals.
- Wavy projectiles using sinusoidal trajectories.
- A ramming enemy type focused on planet damage.
- Player upgrade choices after rounds.
- Bonus rewards for saving all attacked planets in a wave.
- More boss variants and elite escorts.
