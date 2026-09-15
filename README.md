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
js/main.js            # image config, carousels, theme, mobile menu, active nav + progress
assets/
  images/projects/      # project screenshots (carousels)
  images/achievements/  # hackathon / competition photos (carousels)
  images/certificates/  # certificate scans (single image each)
  profile/              # portrait, brand mark, favicons, Open Graph card
resume.pdf            # TODO: not added yet; the sidebar button already links here
```

## Adding images

**Projects and achievements** use carousels. The file lists live at the top of [js/main.js](js/main.js) in the `IMAGES` object; add or remove paths there and drop the files in place. Missing files are skipped, and when none of a card's files exist the dotted placeholder shows. Arrows and dots appear only when two or more images load.

| Card | Config key | Default paths |
|---|---|---|
| SARO | `projects.saro` | `assets/images/projects/saro-1.jpg` … `saro-3.jpg` |
| ARGUSPH | `projects.argusph` | `assets/images/projects/argusph-1.jpg` … `argusph-3.jpg` |
| SafeTrack | `projects.safetrack` | `assets/images/projects/safetrack-1.jpg` … `safetrack-3.jpg` |
| Intelligent Library Assistant | `projects["library-assistant"]` | `assets/images/projects/library-assistant-1.jpg` … `-3.jpg` |
| Ibalong Hackathon 2026 | `achievements["ibalong-2026"]` | `assets/images/achievements/ibalong-2026-1.jpg` … `-3.jpg` |
| AI4AI Fair 2026 | `achievements["ai4ai-2026"]` | `assets/images/achievements/ai4ai-2026-1.jpg` … `-3.jpg` |

**Certificates** are single images referenced directly in `index.html`:

| Certificate | Path |
|---|---|
| Programming (Java) NC III | `assets/images/certificates/tesda-java-nc3.jpg` |
| Practical Applications of AI for Daily Use | `assets/images/certificates/albay-ai-practical-applications.jpg` |
| Introduction to Cybersecurity | `assets/images/certificates/cisco-intro-cybersecurity.jpg` |
| Junior Cybersecurity Analyst | `assets/images/certificates/cisco-junior-cybersecurity-analyst.jpg` |

**Portrait**: overwrite `assets/profile/kim.png` (transparent PNG, roughly square). The brand mark, favicons, and `og.png` are separate files in the same folder and need regenerating if the portrait changes.

## Deployment

Live on Vercel as a static site with zero configuration. Every push to `main` redeploys.

## Design

Visual language follows the [bryl-minimal-design](https://github.com/bryllim/bryl-minimal-design) skill: monochrome palette, Geist / Geist Mono / Geist Pixel typography, light and dark themes.
