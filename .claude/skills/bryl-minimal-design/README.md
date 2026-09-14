# bryl-minimal-design

hi, I'm [Bryl](https://bryllim.com). I spent way too long fine-tuning the design of my portfolio — the monochrome palette, the tiny uppercase mono labels, the halftone dots, the little fade-up on page load — so I turned the whole thing into an [agent skill](https://agentskills.io) that anyone can use.

Install it, and your AI coding agent (Claude Code or anything that reads `SKILL.md`) learns my design language and applies it to whatever you're building. True black on white, no accent color, Geist everywhere, numbered section headers like `01 — about`, soft shadows, proper light/dark theming. The stuff I'd nitpick in a PR, basically.

It's written as a spec in plain words — values and intent, zero framework code — so it works the same whether your project is plain HTML, Tailwind, React, Vue, or something weirder. Your agent implements it in whatever your project already uses.

## install

**Claude Code:**

```bash
# for all your projects
git clone https://github.com/bryllim/bryl-minimal-design ~/.claude/skills/bryl-minimal-design

# or just one project
git clone https://github.com/bryllim/bryl-minimal-design .claude/skills/bryl-minimal-design
```

**other agents:** anything that supports the SKILL.md format can use this repo as-is — just point it at `SKILL.md`.

## use

Ask for something minimal and it should kick in on its own, or name it directly:

> build a landing page for my side project, use the bryl-minimal design language

> restyle this dashboard with bryl-minimal

If the result doesn't look like [my site](https://bryllim.com), something went wrong — open an issue, I'd genuinely like to know.

## what's inside

- `SKILL.md` — the whole design language: philosophy, the color ramp (light + dark values), the four font roles, layout, component recipes, the halftone motif, motion timing, and a step-by-step order for restyling existing projects.
- `evals/` — the test prompts I used to check that agents actually reproduce the aesthetic instead of drifting off into beige-and-serif land (they do drift, badly, without the skill).

## fonts

The system leans on [Geist & Geist Mono](https://vercel.com/font) and [Geist Pixel](https://github.com/vercel/geist-pixel-font) by Vercel, plus [Source Serif 4](https://fonts.google.com/specimen/Source+Serif+4) for long-form text. All free, all openly licensed.

## license

MIT — take it, remix it, ship it. If you build something with it, I'd love to see.
