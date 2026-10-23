# Neon Rush

A small Friday Night Funkin'-style rhythm game that runs in the browser.
Hit the falling notes on the strum line as they reach it.

## Play

Open `index.html` in any modern browser (Chrome, Edge, Firefox, Safari).
No build step or server is needed.

## Controls

| Key            | Lane |
| -------------- | ---- |
| `D` / Left     | 1    |
| `F` / Down     | 2    |
| `J` / Up       | 3    |
| `K` / Right    | 4    |

- `Enter` starts the song from the menu or the results screen.
- `Esc` quits to the menu during a song.

## Scoring

- Sick (within 45 ms) = 350 points, Good (within 90 ms) = 200, Bad (within 135 ms) = 100.
- Missing a note costs health. Run the health bar to zero and the song fails.
- Rank is based on accuracy: S at 95%+, A at 85%+, B at 70%+, C at 50%+.

## The song

**Neon Rush** (120 BPM, 32 bars, about 67 seconds) is an original chord progression
(Am, F, C, G) with a generated chart. The audio is synthesized in the browser with the
Web Audio API, so the project includes no copyrighted music or sprites.

## Files

- `index.html` - page layout and menus
- `style.css` - styling
- `game.js` - chart, synthesized music, timing, scoring, and rendering
