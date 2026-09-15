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
js/main.js            # image config, carousels, theme, mobile menu, active nav, reveals
js/kuro.js            # Kuro, the cat: oneko.js sprites/idle logic (MIT) with smooth movement, wander / follow / stay modes, petting, drag, speech bubble, favicon
assets/
  images/projects/      # project screenshots (carousels)
  images/achievements/  # hackathon / competition photos (carousels)
  images/internships/   # internship completion certificates (single image each)
  images/certificates/  # certificate scans (single image each)
  profile/              # portrait (kim.png), Open Graph card
  kuro/jess.png         # Kuro's sprite sheet: 256x128, 8x4 cells of 32x32, oneko layout
  fonts/                # Geist Pixel (self-hosted, SIL OFL)
resume.pdf            # shown by "view resume": a viewer dialog on desktop, the file itself on phones
```

Kuro, the black cat, is built on [oneko.js](https://github.com/adryd325/oneko.js) by adryd (MIT, license kept in `js/kuro.js`). He sits on the page, so he scrolls with it and stays where he was left. Clicking him (tapping, on phones) cycles his modes: wander (strolls to quiet spots, never onto text or links), follow (chases your cursor, desktop only) and stay. Drag him anywhere and he stays there. Rest the cursor on him to pet him. He remembers his mode and spot between visits. His sprite sheet is `assets/kuro/jess.png`; swap that file for another 256x128 oneko-layout sheet to change his look. The favicon is his face, cropped from the same sheet at runtime; there is no committed favicon file.

## Adding images

**Projects and achievements** use carousels. The file lists live at the top of [js/main.js](js/main.js) in the `IMAGES` object; add or remove paths there and drop the files in place. Entries are a path string or `{ src, caption }`; a caption shows as a small chip on that slide (use the form "Document name · Year"). Missing files are skipped, and when none of a card's files exist the dotted placeholder shows. Arrows and dots appear only when two or more images load.

| Card | Config key | Default paths |
|---|---|---|
| SARO | `projects.saro` | `assets/images/projects/saro-1.jpg` … `saro-3.jpg` |
| ARGUSPH | `projects.argusph` | `assets/images/projects/argusph-1.jpg` … `argusph-3.jpg` |
| SafeTrack | `projects.safetrack` | `assets/images/projects/safetrack-1.jpg` … `safetrack-3.jpg` |
| Intelligent Library Assistant | `projects["library-assistant"]` | `assets/images/projects/library-assistant-1.jpg` … `-3.jpg` |
| Ibalong Hackathon 2026 (event photos) | `achievements["ibalong-2026"]` | `assets/images/achievements/ibalong-2026-1.jpg` … `-3.jpg` |
| AI4AI Fair 2026 (event photos) | `achievements["ai4ai-2026"]` | `assets/images/achievements/ai4ai-2026-1.jpg` … `-3.jpg` |

**Award certificates** (first two rows of the Certificates section) are single images referenced directly in `index.html`:

| Card | Path |
|---|---|
| 3rd Place Certificate, Ibalong Hackathon | `assets/images/achievements/ibalong-cert.jpg` |
| 1st Runner-Up Certificate, AI4AI Fair | `assets/images/achievements/ai4ai-cert.jpg` |

**Internship certificates** are single images referenced directly in `index.html`:

| Entry | Path |
|---|---|
| NRG Info-Tech / TESDA (Programming NC III) | `assets/images/internships/tesda.jpg` |
| Ollopa Corporation | `assets/images/internships/ollopa.jpg` |
| Knowles Training Institute | `assets/images/internships/knowles.jpg` |

**Certificates** are single images referenced directly in `index.html`:

| Certificate | Path |
|---|---|
| Practical Applications of AI for Daily Use | `assets/images/certificates/albay-ai-practical-applications.jpg` |
| Introduction to Cybersecurity | `assets/images/certificates/cisco-intro-cybersecurity.jpg` |
| Junior Cybersecurity Analyst | `assets/images/certificates/cisco-junior-cybersecurity-analyst.jpg` |

**Portrait**: overwrite `assets/profile/kim.png` (transparent PNG, square). `og.png` is a separate file in the same folder and needs regenerating if the portrait changes.

## Deployment

Live on Vercel as a static site with zero configuration. Every push to `main` redeploys.

## Design

Visual language follows the [bryl-minimal-design](https://github.com/bryllim/bryl-minimal-design) skill: monochrome palette, Geist / Geist Mono / Geist Pixel typography, light and dark themes.
