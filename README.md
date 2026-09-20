# Kim De Guzman — Portfolio

Personal portfolio of Adrian Kim P. De Guzman, Information Technology student and full-stack developer based in Ligao City, Albay, Philippines.

Live at <https://kim-deguzman-portfolio.vercel.app>

Single-page static site: plain HTML, CSS, and JavaScript. No framework, no build step.

## Preview locally

Open `index.html` directly in a browser, or serve the folder so fonts and relative paths behave exactly like production:

```bash
# Python
python -m http.server 8000

# or Node
npx serve .
```

Then visit <http://localhost:8000>.

## Structure

```
index.html            # the whole site
css/styles.css        # tokens, layout, components, motion
js/images.js          # the image lists: one entry per project / achievement
js/main.js            # carousels, lightbox, theme, mobile menu, active nav, reveals
js/kuro.js            # Kuro, the cat: oneko.js sprites/idle logic (MIT) with smooth movement, wander / follow / stay modes, petting, drag, speech bubble, favicon
assets/
  images/projects/      # one folder per project, numbered in display order
  images/achievements/  # one folder per award, numbered in display order
  images/internships/   # internship completion certificates (single image each)
  images/certificates/  # certificate scans (single image each)
  images/_originals/    # every photo at full resolution, as delivered
  images/_unused/       # shot but not published, with the reason in git log
  profile/              # portrait (kim.png), Open Graph card
  kuro/jess.png         # Kuro's sprite sheet: 256x128, 8x4 cells of 32x32, oneko layout
  fonts/                # Geist Pixel (self-hosted, SIL OFL)
resume.pdf            # shown by "view resume": a viewer dialog on desktop, the file itself on phones
```

Kuro, the black cat, is built on [oneko.js](https://github.com/adryd325/oneko.js) by adryd (MIT, license kept in `js/kuro.js`). He sits on the page, so he scrolls with it and stays where he was left. Clicking him (tapping, on phones) cycles his modes: wander (strolls to quiet spots, never onto text or links), follow (chases your cursor, desktop only) and stay. Drag him anywhere and he stays there. Rest the cursor on him to pet him. He remembers his mode and spot between visits. His sprite sheet is `assets/kuro/jess.png`; swap that file for another 256x128 oneko-layout sheet to change his look. The favicon is his face, cropped from the same sheet at runtime; there is no committed favicon file.

## Adding images

**Projects and achievements** use carousels. The lists live in
[js/images.js](js/images.js), one entry per card:

```js
"ibalong-2026": {
  title: "Ibalong Festival Hackathon 2026",
  images: [
    {
      src: "assets/images/achievements/ibalong-2026/01-3rd-place-award-card.jpg",
      w: 1080, h: 1080,               // intrinsic size, so nothing shifts on load
      alt: "What the picture shows.", // for someone who cannot see it
      pos: "center 62%",              // optional, when a centre crop cuts the point
      caption: "3rd Place · Bantong Award" // optional chip on the slide
    }
  ]
}
```

Files live one folder per item, named with the order prefix that is their
display order: `01-`, `02-`, `03-`. The first image is the cover, and it is
the one the card shows. Order the rest as a story — the finished thing, then
the moment, then the details.

Missing files are skipped, so a card can be listed before its screenshots
exist; when none of a card's files load, the dotted placeholder shows. Arrows,
dots and the `1 / n` tally appear only when two or more images load. Every
frame opens the lightbox on click, with arrow keys, swipe and Esc.

| Card | Config key | Folder |
|---|---|---|
| SARO | `projects.saro` | `assets/images/projects/saro/` |
| ARGUSPH | `projects.argusph` | `assets/images/projects/argusph/` (empty) |
| SafeTrack | `projects.safetrack` | `assets/images/projects/safetrack/` |
| Intelligent Library Assistant | `projects["library-assistant"]` | `assets/images/projects/library-assistant/` (empty) |
| Ibalong Hackathon 2026 | `achievements["ibalong-2026"]` | `assets/images/achievements/ibalong-2026/` |
| AI4AI Fair 2026 | `achievements["ai4ai-2026"]` | `assets/images/achievements/ai4ai-2026/` |

**Award certificates** (first two rows of the Certificates section) are single
images referenced directly in `index.html`:

| Card | Path |
|---|---|
| 3rd Place Certificate, Ibalong Hackathon | `assets/images/achievements/ibalong-cert.jpg` |
| 1st Runner-Up Certificate, AI4AI Fair | `assets/images/achievements/ai4ai-cert.jpg` |

**Internship certificates** are single images referenced directly in `index.html`:

| Entry | Path |
|---|---|
| NRG Info-Tech / TESDA (Programming NC III) | `assets/images/internships/tesda.jpg` |
| Ollopa Corporation | `assets/images/internships/ollopa.jpg` |
| Knowles Training Institute | `assets/images/internships/knowles.jpg` (not supplied yet) |

**Certificates** are single images referenced directly in `index.html`:

| Certificate | Path |
|---|---|
| Practical Applications of AI for Daily Use | `assets/images/certificates/albay-ai-practical-applications.jpg` |
| Introduction to Cybersecurity | `assets/images/certificates/cisco-intro-cybersecurity.jpg` (not supplied yet) |
| Junior Cybersecurity Analyst | `assets/images/certificates/cisco-junior-cybersecurity-analyst.jpg` (not supplied yet) |

Certificate thumbnails open the same lightbox once their file loads, so the
certificate can be read; the ones still missing keep their placeholder and
stay inert.

**Sizing**: keep the full-resolution file in `assets/images/_originals/` and
publish a resized progressive JPEG — under about 150 KB for a cover or card,
under about 300 KB for a gallery image, longest edge 1200 to 1600 px.
Certificates are only resized and compressed, never cropped or retouched.

**Portrait**: overwrite `assets/profile/kim.png` (transparent PNG, square). `og.png` is a separate file in the same folder and needs regenerating if the portrait changes.

## Deployment

Live on Vercel as a static site with zero configuration. Every push to `main` redeploys.

## Design

Visual language follows the [bryl-minimal-design](https://github.com/bryllim/bryl-minimal-design) skill: monochrome palette, Geist / Geist Mono / Geist Pixel typography, light and dark themes.
