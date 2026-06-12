# Pirxey Space Services

Interaktywna makieta 3D / vertical slice gry kosmicznej inspirowanej identyfikacja i trescia strony Pirxey. Projekt laczy eksploracje ukladu planet-uslug z trybem obrony falowej: gracz lata statkiem, odwiedza planety, dokuje przy nich, kupuje uzbrojenie i broni planet przed atakami obcych form zycia.

## Stack

- React 18
- Vite
- TypeScript
- Three.js
- Tailwind CSS
- WebAudio API

## Uruchomienie

```bash
npm install
npm run dev
```

Domyslny adres dev servera:

```text
http://127.0.0.1:5173/
```

Build produkcyjny:

```bash
npm run build
```

Podglad buildu:

```bash
npm run preview
```

## Glowna petla gry

1. Po wejsciu na strone pojawia sie komunikat o inwazji.
2. Gracz moze rozpoczac bitwe albo przejsc do eksploracji.
3. W trybie eksploracji mozna latac miedzy planetami-uslugami Pirxey i dokowac, aby czytac opisy.
4. W trybie bitwy startuja nieskonczone fale przeciwnikow.
5. Przed kazda fala pojawia sie `Next round` z odliczaniem.
6. Zywe planety odzyskuja HP na poczatku rundy.
7. Zniszczone planety eksploduja i nie wracaja juz do meczu.
8. Game over nastepuje po zniszczeniu statku gracza albo utracie wszystkich planet.

## Mechaniki

- Realistyczna scena kosmiczna 3D z orbitami, gwiazda centralna, planetami-uslugami i statkiem gracza.
- Manualne latanie, autopilot i dokowanie do planet.
- Fale przeciwnikow atakujacych jedna lub kilka planet.
- Wrogowie nie powinni przecinac planet ani slonca; maja separacje i podstawowe omijanie cial niebieskich.
- Death Star boss pojawia sie od 5 fali, goni gracza i strzela wieloma dzialami.
- Planety maja osobne HP, a statek gracza ma HP i feedback trafienia.
- Mozliwy restart meczu albo powrot do eksploracji po game over.
- Pauza zatrzymuje symulacje.

## Uzbrojenie

Gracz ma domyslne `Scout Bolts` z nieskonczona amunicja. Kupowane bronie maja limit ammo i wymagaja reloadu w planetarnych sklepach.

Primary:

- `Pulse Laser` - szybki, precyzyjny laser.
- `Twin Cannons` - dwa boczne tory strzalu.
- `Rail Splitter` - wolniejszy, mocniejszy strzal.
- `Rapid Repeater` - bardzo szybka bron do obrony bliskiego sektora.

Secondary:

- `Homing Missiles` - rakiety szukajace najblizszego celu w kierunku strzalu.
- `Plasma Orb` - kula plazmowa z obrazeniami obszarowymi.
- `Arc Pulse` - impuls elektryczny wokol statku.

## Sterowanie

- `W` - ciag.
- `Shift` - boost.
- `A` / `D` - yaw.
- `ArrowUp` / `ArrowDown` - pitch.
- `Space` / `C` - gora / dol.
- `Q` / `E` - unik boczny w bitwie.
- `F` lub lewy przycisk myszy - ciagly ogien primary.
- `G` lub prawy przycisk myszy - ogien secondary.
- `E` - dokowanie w eksploracji lub zakup/reload broni przy planecie w bitwie.
- Przycisk trybu kamery pozwala przelaczac drag camera / mouse aim.

## Audio

Projekt korzysta z WebAudio API oraz lokalnych sampli WAV dla:

- strzalow laserowych,
- eksplozji wrogich statkow,
- rakiet,
- atakow plazmowych,
- muzyki bitwy odtwarzanej z folderu `soundtrack/`.

Szczegoly licencji i atrybucji sa w [docs/audio-attribution.md](docs/audio-attribution.md).

Wazne: jeden z efektow (`05780 space missile.wav`) ma licencje `Attribution NonCommercial 4.0`, wiec przy komercyjnym wykorzystaniu projektu trzeba go wymienic albo uzyskac osobna zgode autora.

## Struktura projektu

```text
src/components/SpaceExperience.tsx  # glowna scena React + integracja runtime
src/game/audio.ts                   # WebAudio, sample, soundtrack effects
src/game/factories.ts               # fabryki statkow, pociskow, wrogow, efektow 3D
src/game/types.ts                   # typy runtime gry
src/game/waves.ts                   # konfiguracja fal i spawnow
src/game/weapons.ts                 # katalog broni, ceny, ammo i oferty planet
src/game/textures.ts                # proceduralne tekstury i sprite glow
src/game/math.ts                    # helpery matematyczne
src/data/services.ts                # planety-uslugi Pirxey
docs/space-defense-plan.md          # pierwotny plan rozbudowy gry
docs/wave-roadmap.md                # plan eskalacji fal
docs/audio-attribution.md           # licencje audio
```

## Status

To jest grywalny prototype / vertical slice jednej mapy. Priorytetem sa teraz balans walki, czytelnosc UI, feedback audio-wizualny, performance przy falach i dalsze typy przeciwnikow oraz upgrade'y roguelike.
