# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Static HTML, CSS, and JavaScript. No framework, no bundler, no npm install required to run. Deploy target is Vercel as a zero-config static site; source is pushed to GitHub. (Confirmed in the build brief, TASK.md.)

## Users

Primary: recruiters, hiring managers, internship coordinators, and hackathon/competition organizers evaluating Adrian Kim P. De Guzman ("Kim") for internships, freelance work, or entry-level developer roles. They arrive from a resume, LinkedIn, GitHub, or a shared link, usually on a phone or laptop, and want to verify credentials and see real project work within a minute or two.

Secondary (inferred from brief, not confirmed): classmates, professors, and collaborators who want contact details or a quick look at Kim's projects.

## Product Purpose

A single-page personal portfolio that presents Kim as an Information Technology student and full-stack developer. It exists so that anyone evaluating Kim can see, in one place, who he is, where he studies, what he can build, where he has worked, what he has shipped, and how to reach him. Success is a visitor forming a clear, credible picture of Kim's skills and contacting him via email, phone, GitHub, LinkedIn, or Facebook.

## Positioning

A BSIT student who has already shipped full-stack, AI-integrated civic tech platforms end to end (SARO, ARGUSPH, the Intelligent Library Assistant), placed in regional hackathons, and worked in remote international internships. The distinguishing claim is breadth backed by real, named deliverables: database architecture through mobile and web interfaces, across web, mobile, and civic-tech systems, while still a student in Ligao City, Albay.

## Operating Context

- The site is viewed from resume/LinkedIn links, often on mobile first.
- Content is maintained by Kim directly by editing HTML and dropping image files into pre-wired asset folders; there is no CMS or build step.
- Repository lives on GitHub (github.com/Vurios); hosting is Vercel static deploy.

## Capabilities and Constraints

Confirmed sections, in order: Hero, 01 About, 02 Education, 03 Skills, 04 Experience, 05 Projects, 06 Certifications & Achievements, 07 Contact / Footer. Anchor navigation between numbered sections with smooth scroll.

Confirmed requirements: fully responsive from small phones to desktop; semantic HTML with sensible heading hierarchy and keyboard-navigable nav; light/dark theme toggle; fast load with no heavy dependencies beyond fonts; project and certification cards with image slots that fall back to a placeholder when the file is missing.

Confirmed exclusions: no blog, shop, consulting, collabs, gear, resources, recommendations/testimonials, affiliations, community chat, command-palette search, typing test, or GitHub contribution heatmap. No fake stats, testimonials, or numbers beyond the brief.

Terminology: "Kim" is the preferred short name; full name is Adrian Kim P. De Guzman.

Undecided: whether a downloadable resume PDF will be added later (not in this pass).

## Brand Commitments

- Visual language is bound to the `bryl-minimal-design` skill installed at `.claude/skills/bryl-minimal-design/SKILL.md`: monochrome black/white palette with light/dark theming, Geist / Geist Mono typography, small uppercase mono labels, numbered section headers ("01 — about"), halftone dot motif, soft shadows, fade-up entrance motion. Only the design language is borrowed; none of bryllim.com's content, structure, or extra features.
- Voice: first-person, friendly but professional. Display name "Kim De Guzman".

## Evidence on Hand

All content is real and supplied in TASK.md: education, skills, three internship/training experiences, three named projects with tech stacks, five certifications/achievements, and contact/social links.

Absent, must not be fabricated: project screenshots (`assets/images/projects/`), certificate and event images (`assets/images/certifications/`), profile photo (`assets/profile/`). Placeholders only until Kim drops files in.

## Product Principles

1. Credibility over flourish: every claim on the page traces to a real credential, project, or role in the brief.
2. One page, one scroll: everything a recruiter needs is reachable by anchor without leaving the page.
3. Zero-maintenance publishing: editing HTML and dropping images is the whole workflow; nothing requires a build.
4. Mobile is the first viewport, not an afterthought.
5. Content-ready before assets: placeholders point at final paths so images land with no markup changes.

## Accessibility & Inclusion

Semantic landmarks, keyboard-navigable navigation, alt text on every image slot, readable contrast in both themes, and `prefers-reduced-motion` honored (all from the brief and the bound design skill). No additional standard was specified.
