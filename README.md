# Vocābulārium — Latin Vocabulary Tester

A free study tool for **Cambridge Latin Course** vocabulary, Stages I–XII.
One page, no accounts, no tracking, nothing to install — open it and study.

## What it does

- **Three formats** — flashcards, multiple choice, or type the answer.
- **Three directions** — Latin → English, English → Latin, or mixed.
- **Pick your scope** — a single stage, or everything up to a stage.
- **Session length** — 10, 25, 50, 100, or a custom number of questions.
- **Optional timer** — 5–30 seconds per question.
- **Review at the end** — see every word, filter to the ones you missed, and
  retry just those.
- **Light and dark mode** — follows your device by default; the Auto / Light /
  Dark button in the corner overrides it and remembers your choice.

Your format and scope settings are saved in your own browser. Nothing is sent
anywhere — there is no server, no sign-up, and no data collection.

### Typing answers is forgiving

Macrons are optional (`atrium` = `ātrium`), capitals don't matter, leading
articles are ignored (`the dog` = `dog`), and any listed meaning counts
(`works` or `is working`). For verbs that list a perfect form, the perfect is
accepted too but never required.

### Keyboard shortcuts

| Format | Keys |
| --- | --- |
| Flashcard | `Space` to flip · `1` got it · `2` missed it |
| Multiple choice | `1`–`4` to answer · `Enter` to continue |
| Type it | `Enter` to check, then `Enter` to continue |

## One file

The whole tool is `index.html` — styles, word list and logic inlined, about
60 KB. No build step, no dependencies, no network calls.

That means you can host it, email it, drop it in Google Drive, or hand it to
someone on a USB stick, and double-clicking it just works — offline, on a
school laptop, with nothing installed.

Inside the file, in order:

1. **The styles** — everything visual, including both themes.
2. **The word list** — marked `THE WORD LIST`.
3. **The app** — marked `THE APP`.

## Editing the word list

Search `index.html` for `THE WORD LIST`. Every word is one line:

```js
{ stage: 3, latin: "taberna", english: ["store", "inn"] },
```

- `stage` — 1 to 12; the stage pickers use this.
- `latin` — shown as the prompt for Latin → English.
- `english` — every meaning that should be marked correct. The first one leads.
- `perfect` — optional perfect tense, e.g. `perfect: "cēnāvit"`. It is shown as
  a hint on flashcards and accepted when typing, but never required.

To cover more stages, add entries with a higher `stage` number and raise
`MAX_STAGE`, just below the word list.

## Running it locally

Double-click `index.html`. That is the whole procedure.

## Deploying to Vercel

The repo is already a deployable static site — no framework preset, no build
command:

1. In your Vercel project, connect this GitHub repo.
2. Framework preset: **Other**. Root directory: `./`.
3. Leave the build command and output directory empty.
4. Deploy. Every push to the connected branch redeploys automatically.

Pages are served with `must-revalidate`, so once you push a fix, everyone gets
it on their next page load — no cache-clearing instructions for your class.
