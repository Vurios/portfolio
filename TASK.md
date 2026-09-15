<!-- How to use this: open an empty project folder for the portfolio repo, start Claude Code there, and paste this whole file as your first message (or save it as TASK.md in the repo and tell Claude Code to follow it). -->
Build Prompt: Portfolio Website for Adrian Kim P. De Guzman
Context

Build a personal portfolio website for Adrian Kim P. De Guzman ("Kim"), a BSIT student and full-stack developer based in Ligao City, Albay, Philippines. The site will be pushed to GitHub and deployed on Vercel.

Stack: plain HTML, CSS, and JavaScript only. No React, no framework, no bundler, no npm install step required to run it. It must work as a static site Vercel can deploy with zero build configuration.

Step 1: Install and apply the design skill

Clone the design skill into this project before writing any code:

git clone https://github.com/bryllim/bryl-minimal-design .claude/skills/bryl-minimal-design

Read .claude/skills/bryl-minimal-design/SKILL.md in full and apply its design language: the monochrome black/white palette with proper light/dark theming, the small uppercase mono labels, the halftone dot motif, its numbered section header convention, Geist / Geist Mono typography, soft shadows, and the fade up motion on page load.

Important scope limit: only borrow the design language (colors, type, spacing, motion, component styling) from that skill. Do not copy bryllim.com's actual content, page structure, or extra features. This is not his portfolio. Leave out his blog, shop, gear, consulting, collabs, community chat widget, command palette search, typing speed game, GitHub contribution heatmap, recommendations/testimonials, and affiliations. Build only the sections listed below, using Kim's real content.

Step 2: Site content

Single scrollable page (index.html) with anchor navigation between sections, in this order:

Hero
Name: Adrian Kim P. De Guzman (display as "Kim De Guzman" or similar, friendly but professional)
Role line: "Information Technology Student & Full-Stack Developer"
Short first-person intro, reworded from (don't paste verbatim) this summary: Information Technology student and full-stack developer with hands-on experience across web development, mobile applications, and civic tech systems, gained through IT internships, hackathon competitions, and freelance client work. Builds full-stack, AI-integrated platforms end to end, from database architecture to user-facing interfaces.
Location: Ligao City, Albay, Philippines
Contact: deguzmanadriankim@gmail.com (mailto link), +63 920 238 0937 (plain text is fine)
Social links: GitHub (https://github.com/Vurios), LinkedIn (https://www.linkedin.com/in/adrian-kim-de-guzman-2b3683367/), Facebook (https://www.facebook.com/kim.pdeguzman/). Use real <a href> links (open in a new tab), with icons if the design skill's icon style allows it.
01: About

Short about paragraph built from the summary above, plus 2 to 3 quick highlight stats/badges, e.g.:

President's & Dean's Lister, A.Y. 2023 to Present
3rd Place, Ibalong Festival Hackathon 2026
1st Runner-Up, AI4AI Fair Vibe Coding Competition 2026
02: Education

Most recent first:

Bicol University Polangui Campus, BS Information Technology, expected graduation 2027. Consistent President's and Dean's List Awardee, A.Y. 2023 to Present.
Ligao National High School, Senior High School, STEM strand, 2021 to 2023. Graduated With Honors.
03: Skills

Five labeled tag/chip groups:

Programming Languages: Java, JavaScript, HTML/CSS, Python, C++, C#, PHP, Kotlin
Frameworks & Libraries: React.js, Node.js, Next.js, Vite, Leaflet.js, Bootstrap
Databases & Backend: MySQL, Firebase, XAMPP, Supabase, PostgreSQL
Systems & Networking: Computer Hardware/Software Troubleshooting, System Diagnostics, Windows/OS Maintenance, IT Infrastructure Support, Cisco Packet Tracer
Tools & Platforms: GitHub, Figma, Google Antigravity, Canva, WordPress, Vercel, Claude, Gemini AI, ChatGPT
04: Experience

Stacked cards or a vertical timeline, oldest to newest:

NRG Info-Tech Institute, Inc. (TESDA Scholarship Program), Java Programming NC III Trainee, Ligao City, Albay (Hybrid), June 2025 to August 2025
Developed and deployed applications within a structured systems development workflow covering planning, coding, testing, and documentation.
Built multiple Java-based programs and mini-projects applying OOP concepts: data handling, control structures, modular design.
Participated in hands-on workshops, skills assessments, and project presentations with fellow trainees.
Ollopa Corporation, Programming Intern, Fairview, Quezon City (Remote), August 2025 to September 2025
Applied advanced OOP concepts in a real enterprise setting: object-oriented analysis, design, and Java application development under industry supervision.
Designed and storyboarded game concepts, mechanics, and digital assets as part of a Game Design and Development track.
Met industry-level quality standards while strengthening critical thinking and professional communication in a fast-paced environment.
Knowles Training Institute x SSGC Group, IT Intern, Singapore (Remote), April 2026 to June 2026
Led the field monitoring team as Team Leader: supervised fellow interns, oversaw documentation and reporting, coordinated cross-departmental issue resolution.
Built and maintained company websites using WordPress: content updates, layout improvements, digital asset integration.
Designed social media visuals and multimedia content for international branding, collaborating with interns across departments and schools in a remote, multicultural environment.
05: Projects

This is the main "screenshot cards" section. Build one reusable project-card component and repeat it. Each card needs: title, category/subtitle, one paragraph description, a tech-stack tag list, and an image slot.

There are no images yet. Render each image slot as a clean placeholder (a bordered box using the halftone dot pattern from the design skill, with the project's initials centered) instead of a broken <img>. Point each placeholder at a real relative path so screenshots can be dropped in later with no markup changes, e.g. assets/images/projects/saro.jpg, assets/images/projects/argusph.jpg, assets/images/projects/library-assistant.jpg. Use an onerror fallback (or equivalent) so a missing file quietly shows the placeholder.

Projects, in this order:

SARO: Unified Geo-Reporting and Municipal Emergency Dispatch Ecosystem Category: Web Development & Civic Tech Project | Ibalong Hackathon Description: Full-stack civic reporting and emergency dispatch platform for Legazpi City, built as a React web app and a React Native mobile app, with an AI chatbot for hazard reporting, automated department routing that replaces 20+ municipal hotlines, and hyper-local Mayon/flood GIS overlays. Tags: React (Web), React Native (Mobile), Supabase, Leaflet, AI Chatbot Badge: 3rd Place, Ibalong Festival Hackathon 2026
ARGUSPH: Crime and Incident Reporting Platform for PNP Polangui Category: Civic Tech & Public Safety Project | Independent Development Description: Full-stack admin dashboard (HTML/CSS/JS) and a React Native mobile app built for agency responders at the PNP Polangui Municipal Police Station, with an AI chatbot and a Python-based facial recognition verification service on Google Cloud Run. Covers crime and incident reporting, police blotter, officer rosters, and an interactive crime map. Tags: HTML/CSS/JS (Web), React Native (Mobile), Firebase/Firestore, Python, Google Cloud Run, AI Chatbot
Intelligent Library Assistant for Collection Analysis and Narrative Reporting
Category: Capstone Project | Bicol University Polangui
Description: AI-integrated library management system built for Bicol University Polangui, accessible only to librarians and authorized library staff. Built as a browser-based Progressive Web App using PHP, CSS, and JavaScript with Bootstrap, it lets staff query the catalog through a Gemini API chatbot and scan book covers with a Gemini Vision image-recognition module that auto-extracts title and author straight into the Firebase catalog. The same web app analyzes the collection against the accreditation standard of five books per student per academic program and uses the Gemini API to auto-generate accreditation-ready narrative reports, all synced in real time through Firebase.
Tags: PHP, CSS, JavaScript, Bootstrap, Firebase, Gemini API, Gemini Vision
06: Certifications & Achievements

A second card grid, visually distinct from the Projects cards (smaller, badge style, no long description). This covers TESDA/Cisco certificates and hackathon placements together since they're both credentials here. Each card needs: title, issuing body or event name, year, and an image slot for the certificate/badge or an event photo, using the same placeholder approach as Projects, pointed at assets/images/certifications/....

Items:

3rd Place, SARO: Unified Geo-Reporting and Municipal Emergency Dispatch Ecosystem, Ibalong Festival Hackathon: Heroes of Innovation Challenge, 2026
1st Runner-Up, AI-Powered Rural Development Solution (SafeTrack), AI4AI Fair: Vibe Coding Competition, 2026
Introduction to Cybersecurity, Cisco Networking Academy, 2026
Junior Cybersecurity Analyst, Cisco Networking Academy, 2026
Programming (Java) NC III, TESDA Scholarship Program, NRG Info-Tech Institute, Inc., 2025
07: Contact / Footer

Short closing line, mailto link to deguzmanadriankim@gmail.com, phone number, location (Ligao City, Albay), and the same GitHub, LinkedIn, and Facebook links as the hero. Footer with name and year.

Step 3: Asset folder structure

Create these folders now, even though images aren't ready yet (add a .gitkeep in each so git tracks the empty folders):

assets/
  images/
    projects/
    certifications/
  profile/

Don't add any real images in this pass. Just wire up the paths and placeholders so images can be dropped in later with no code changes.

Step 4: Technical requirements
Plain HTML/CSS/JS only, no build step to run it locally.
Fully responsive, from small phones to desktop.
Semantic HTML with a sensible heading hierarchy, alt text placeholders, and keyboard-navigable nav.
Fast-loading, no heavy external dependencies beyond fonts.
Light/dark theme toggle, consistent with the design skill's theming system.
Smooth-scroll anchor navigation between the numbered sections.
Step 5: Repo and deployment prep
Initialize git if needed, with a sensible .gitignore (OS/editor cruft, plus node_modules in case tooling gets added later).
Add a short README.md: what the project is, how to preview it locally, and a note that it deploys via Vercel.
Keep zero required build configuration so Vercel can deploy it as a static site out of the box. No vercel.json unless a routing edge case actually needs it.
Stop after the site is built and committed locally. Don't push to GitHub or deploy to Vercel automatically. Tell me the exact commands to run for both so I can review the site first.
Out of scope for this pass
No real screenshots or certificate images yet, placeholders only. Those get dropped into the asset folders later.
No blog, shop, consulting, collabs, gear, resources, recommendations, affiliations, community chat, command-palette search, or typing-test sections. Those are bryllim.com features, not part of this portfolio.
No fake stats, testimonials, or numbers that aren't in the content above.