# Pirxey Space Defense Plan

## Cel
Przeksztalcic makiete 3D w grywalny vertical slice: jedna mapa, fale przeciwnikow, obrona planet, strzelanie ze statku gracza i prosta logika aggro grupowego.

## Zasady pierwszej wersji
- Mapa zostaje jedna: kosmiczny uklad planet-uslug Pirxey.
- Gracz lata statkiem i moze wlaczyc autopilot do aktualnej planety.
- Przeciwnicy pojawiaja sie falami bez koncowego limitu rund.
- Kazda fala wybiera planete celu; wrogowie leca w jej strone.
- Strzal w przeciwnika ustawia aggro calej grupy atakujacej te sama planete.
- Przeciwnicy maja na start jeden powolny typ ataku: pojedynczy pocisk.
- System atakow ma byc przygotowany na pozniejsze patterny: burst, wave/sine, multi-shot i szybsze cooldowny co kilka fal.
- Priorytetem jest czytelna mechanika walki, nie itemy/upgrade'y.

## Docelowy podzial kodu
- `src/components/SpaceExperience.tsx` - warstwa React, UI, lifecycle sceny i spinanie systemow.
- `src/game/types.ts` - wspolne typy runtime: planety, przeciwnicy, pociski, fale, telemetria.
- `src/game/math.ts` - clamp, deterministyczne losowanie, kolory, formaty.
- `src/game/textures.ts` - proceduralne tekstury planet, slonca i glow sprites.
- `src/game/factories.ts` - tworzenie statku, dzial, przeciwnikow, pociskow, orbit i gwiazd.
- `src/game/waves.ts` - konfiguracja fal i przyszle wzorce atakow.

## Sterowanie
- `W` / `Shift` - ciag / boost.
- `A` / `D` - yaw.
- `ArrowUp` / `ArrowDown` - pitch.
- `Space` / `C` - gora / dol.
- `F` - strzal z dzial statku.
- `E` - dokowanie w zasiegu planety.
- Drag mysza - obrot statku/kamery.

## Etap 1 - realizowany teraz
- Rozdzielic duzy plik sceny na moduly.
- Dodac dziala i pociski gracza.
- Dodac jeden typ wroga: kosmiczny bug/raider.
- Dodac fale, licznik rund i cele planetarne.
- Dodac powolne pociski przeciwnika.
- Dodac proste HP planet, zabijanie wrogow i aggro grupowe po trafieniu.

## Kolejne kroki
- Itemy i buildy roguelike.
- Rzadkie mini-bossy co kilka fal.
- Patterny atakow zalezne od fali.
- Dropy/XP i wybor upgrade'ow.
- Balans rozmiarow mapy, predkosci oraz czytelnosci pociskow.
