# Vocābulārium — Latin Vocabulary Tester

A free study tool for the **North American Cambridge Latin Course, 6th edition**
vocabulary checklists, Unit 1, Stages I–XII.
One page, no accounts, no tracking, nothing to install — open it and study.

## What it does

- **Three formats** — flashcards, multiple choice, or type the answer.
- **Three directions** — Latin → English, English → Latin, or mixed.
- **Pick your scope** — a single stage, or everything up to a stage.
- **Session length** — 10, 25, 50, 100, or a custom number of questions. If the
  scope has fewer words than you asked for, the words repeat: every word comes
  up once per round, each round is reshuffled, and no word appears twice in a row.
- **See the words** — browse the checklist for your scope before you start.
- **Verb endings** — practise the checklist verbs in the present, imperfect
  and perfect, singular (s/he) and plural (they): *portat · portant,
  portābat · portābant, portāvit · portāvērunt*. Either **name the form**
  ("which form is *portābant*?") or **make the form** ("*portat* →
  imperfect, plural"), or a mix. Pick any of the three tenses. "See the verb
  tables" shows every verb in your scope written out.
- **Weak words** — every answer is remembered on your device. A word you miss
  is marked as one you keep missing until you get it right twice in a row,
  and "Only ones I keep missing" quizzes just those. They're highlighted in
  the word list too.
- **Test mode** — no answers shown until the end, then a letter grade
  (A 90%+, B 80%+, C 70%+, D 60%+). Ending early counts the rest as skipped.
  Tests use multiple choice or typing.
- **Optional timer** — 5–30 seconds per question.
- **Review at the end** — see every word, filter to the ones you missed, and
  retry just those (each missed word once).
- **Light and dark mode** — follows your device by default; the Auto / Light /
  Dark button in the corner overrides it and remembers your choice.

Your settings and your weak-word progress are saved in your own browser. Nothing is sent
anywhere — there is no server, no sign-up, and no data collection.

### Typing answers is forgiving

Macrons are optional (`atrium` = `ātrium`), capitals don't matter, leading
articles are ignored (`the dog` = `dog`), and any listed meaning counts
(`works` or `is working`). Checklist synonyms count when typing Latin: for
"now", both `iam` and `nunc` are right. Multiple choice never offers two
right answers. For verbs that list a perfect form, the perfect is
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
3. **The verb forms** — marked `VERB FORMS`: imperfect and perfect for every
   checklist verb, used by the verb endings practice.
4. **The app** — marked `THE APP`.

## Which words are checked against the 6th edition

- **Stages 4, 8, 12** — copied word for word from the 6th edition sample
  that CSCP has published (Student's Book pp. 66, 138, 210).
- **Stages 1–3, 5–7, 9–11** — carried over from the earlier editions, with
  the moves those three lists show applied (ecce! → Stage 4; leō and signum
  → Stage 8). The room names (ātrium, cubiculum, culīna, tablīnum,
  triclīnium) are no longer on the checklists. Check these stages against
  the Vocabulary checklist page at the end of each stage in the book.

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
