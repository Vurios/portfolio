# Portfolio screenshot refresh

Updated November 8, 2026.

- ARGUSPH web UI: captured from the current local `ARGUSPH/admin` source. Auth and data were supplied only in the capture browser with synthetic records; screenshots explicitly say "Demo data / portfolio preview". No production records were changed. Login, overview, map and emergency broadcast were replaced.
- ARGUSPH mobile UI: the user requested English after the Filipino gallery revision. This slide now reuses the archived English captures in `assets/images/_originals/projects/argusph/`: `06-mobile-home.png`, `54187026-4861-4e8a-b468-af74587a243a.jpg` (map), and `eda6636b-6dd4-408c-a942-4f2f434978de.jpg` (Law Chat). These predate the October 25 redesign and are not new build-47 captures. The refined handset frames are retained.
- Library UI: captured from `library_admin - Copy` using its built-in local defense demo, Firebase emulators and demo librarian. Login, book collection, Smart Scan, assistant and collection analysis were replaced; narrative report was added. The orange demo-runner overlay is hidden only in the capture browser at the user's request. Screens remain local demo captures, not production validation. No production library data was changed.
- SARO UI: retained original resident home, hazard form and assistant screens from `assets/images/_originals/projects/saro/`; rebuilt only their handset presentation.
- Both mobile slides use `scripts/make-phone-slide.mjs`, 1600 x 1000, quality 90. Screenshot proportions are preserved. Slim metallic frames, matching inner/outer corner geometry and separated handsets replace the thick black overlapping frames.
- Existing project logo assets are unchanged; logos are not UI screenshots.
