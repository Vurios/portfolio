# Kim De Guzman — Portfolio

Personal portfolio of Adrian Kim P. De Guzman, Information Technology student and full-stack developer based in Ligao City, Albay, Philippines.

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
css/styles.css        # design tokens, layout, components, motion
js/main.js            # theme toggle, mobile menu, active nav, scroll reveal
assets/
  fonts/              # Geist Pixel (self-hosted, SIL OFL)
  images/projects/    # project screenshots (drop files here)
  images/certifications/  # certificate / badge images (drop files here)
  profile/            # kim.png, the hero portrait (transparent PNG)
```

## Adding images

Each project and certification card already points at a file path. Drop an image at that path and the placeholder is replaced automatically, no markup changes needed:

| Card | Path |
|---|---|
| SARO | `assets/images/projects/saro.jpg` |
| ARGUSPH | `assets/images/projects/argusph.jpg` |
| Intelligent Library Assistant | `assets/images/projects/library-assistant.jpg` |
| Ibalong Hackathon 3rd Place | `assets/images/certifications/ibalong-hackathon-2026.jpg` |
| AI4AI Vibe Coding 1st Runner-Up | `assets/images/certifications/ai4ai-vibe-coding-2026.jpg` |
| Cisco Intro to Cybersecurity | `assets/images/certifications/cisco-intro-cybersecurity.jpg` |
| Cisco Junior Cybersecurity Analyst | `assets/images/certifications/cisco-junior-cybersecurity-analyst.jpg` |
| TESDA Java NC III | `assets/images/certifications/tesda-java-nc3.jpg` |

Project images are shown at 16:9, certification images at 4:3.

To replace the hero portrait, overwrite `assets/profile/kim.png` with another transparent PNG (roughly square, subject centered); the frame and halftone dissolve adapt automatically.

## Deployment

Live on Vercel as a static site with zero configuration. Every push to `main` redeploys.

## Design

Visual language follows the [bryl-minimal-design](https://github.com/bryllim/bryl-minimal-design) skill: monochrome palette, Geist / Geist Mono / Geist Pixel typography, light and dark themes.
