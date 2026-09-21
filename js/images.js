/* Kim De Guzman — portfolio
   Gallery data. One entry per item; the key matches a data-carousel="group:key"
   attribute in index.html, and main.js renders the carousel and lightbox from
   what it finds here. Nothing else in the codebase hard-codes an image path.

   Each item: { title, images: [ { src, w, h, alt, pos, caption } ] }
     src      path from the site root; the first image is the cover
     w, h     intrinsic pixel size, set on the <img> so nothing shifts on load
     alt      what the picture shows, for someone who cannot see it
     pos      optional object-position, when a centre crop would cut the
              part that matters (the placement line on an award card)
     caption  optional chip on the slide, kept to a few words

   Order is the display order: for a project, the logo, then the login screen,
   then the web hero, then features, with the phone slide last. An item with a
   single image renders as a plain image with no carousel controls; an empty
   list falls back to the halftone placeholder.

   Portrait phone screenshots are not listed directly: they are composed into
   one landscape slide by scripts/make-phone-slide.mjs, because a portrait
   screenshot in a landscape frame shrinks to an unreadable sliver. */
var IMAGES = {
  projects: {
    saro: {
      title: "SARO",
      images: [
        {
          src: "assets/images/projects/saro/01-logo.webp",
          w: 1600,
          h: 666,
          alt: "SARO logo: a white house-and-pin mark beside the SARO wordmark on deep navy.",
          caption: "SARO"
        },
        {
          src: "assets/images/projects/saro/02-operations-hero.webp",
          w: 1600,
          h: 1000,
          alt: "SARO web landing page headed “Unified Operations for City Emergency Response”, with a live EOC incident map of Legazpi and a one-hour dispatch target.",
          caption: "Operations portal"
        },
        {
          src: "assets/images/projects/saro/03-track-a-report.webp",
          w: 1600,
          h: 1000,
          alt: "Track-a-report screen: a resident's filed reports beside one report's detail, its QR tracking code and a received-to-resolved pipeline.",
          caption: "Track a report"
        },
        {
          src: "assets/images/projects/saro/04-report-detail-and-closure.webp",
          w: 1600,
          h: 1000,
          alt: "Operator view of the flooding report queue, with a status-update panel, closure proof rule and full audit trail.",
          caption: "Dispatch & closure"
        },
        {
          src: "assets/images/projects/saro/05-mobile-app.webp",
          w: 1600,
          h: 1000,
          alt: "Three phones showing the SARO resident app: the emergency SOS home, the hazard report form, and the AI assistant chat.",
          caption: "Mobile app"
        },
        {
          src: "assets/images/projects/saro/06-ai-report-synthesis.webp",
          w: 1600,
          h: 1000,
          alt: "AI executive intelligence cards, each turning a resident's report into an insight, a probable root cause and a suggested dispatch action.",
          caption: "AI synthesis"
        }
      ]
    },
    argusph: {
      title: "ARGUSPH",
      images: [
        {
          src: "assets/images/projects/argusph/01-logo.webp",
          w: 1400,
          h: 1400,
          alt: "ARGUSPH logo: a gold shield with a lightning bolt cut out of it, on deep navy.",
          caption: "ARGUSPH"
        },
        {
          src: "assets/images/projects/argusph/02-login.webp",
          w: 1600,
          h: 785,
          alt: "ARGUSPH sign-in page headed “Digital Policing. Safer Polangui.”, listing incident reports, crime mapping and audio alerts beside the login form.",
          caption: "Sign in"
        },
        {
          src: "assets/images/projects/argusph/03-station-overview.webp",
          w: 1600,
          h: 1000,
          alt: "Station overview dashboard for PNP Polangui: 49 total reports, 14 urgent cases, and a table of urgent cases by status and date.",
          caption: "Station overview"
        },
        {
          src: "assets/images/projects/argusph/04-crime-map.webp",
          w: 1600,
          h: 1000,
          alt: "Interactive crime map of Polangui with colour-coded incident pins across 44 barangays, and a crime-density ranking beside it.",
          caption: "Crime map"
        },
        {
          src: "assets/images/projects/argusph/05-emergency-broadcast.webp",
          w: 1600,
          h: 1000,
          alt: "Emergency broadcast composer with alert type, message body and target audience, beside quick templates for suspect alerts and disaster advisories.",
          caption: "Emergency broadcast"
        },
        {
          src: "assets/images/projects/argusph/06-mobile-app.webp",
          w: 1600,
          h: 1000,
          alt: "Three phones showing the ARGUSPH responder app: the officer home with a flash-flood alert, the live incident map, and the Law Chat assistant.",
          caption: "Mobile app"
        }
      ]
    },
    safetrack: {
      title: "SafeTrack",
      images: [
        {
          src: "assets/images/projects/safetrack/01-title-slide-hazard-map.webp",
          w: 968,
          h: 501,
          alt: "SafeTrack title card: the name, the tagline “a geo-reporting ecosystem for rural development”, and a map of Polangui pinned with colour-coded hazard markers.",
          caption: "Polangui hazard map"
        },
        {
          src: "assets/images/projects/safetrack/02-team-building-at-competition.webp",
          w: 1280,
          h: 854,
          alt: "Four teammates building SafeTrack on their laptops at a long desk during the AI4AI Fair competition.",
          caption: "Competition day · AI4AI Fair"
        }
      ]
    },
    "library-assistant": {
      title: "Intelligent Library Assistant",
      images: [
        {
          src: "assets/images/projects/library-assistant/01-logo.webp",
          w: 1600,
          h: 650,
          alt: "BU Library Polangui Campus logo: the Bicol University seal beside the library wordmark, on deep navy.",
          caption: "BU Library"
        },
        {
          src: "assets/images/projects/library-assistant/02-login.webp",
          w: 1600,
          h: 786,
          alt: "Library sign-in page headed “Your library, one search away”, with the librarian assistant character beside the email and Google sign-in form.",
          caption: "Sign in"
        },
        {
          src: "assets/images/projects/library-assistant/03-book-collection.webp",
          w: 1600,
          h: 947,
          alt: "Book collection table listing catalogued titles by author, department and year, across 11,881 titles and 21,185 physical copies.",
          caption: "Book collection"
        },
        {
          src: "assets/images/projects/library-assistant/04-ai-cover-scan.webp",
          w: 1600,
          h: 1000,
          alt: "Add-a-book dialog where an AI smart scan of a book cover has filled in the title, author, program and year for checking before saving.",
          caption: "AI cover scan"
        },
        {
          src: "assets/images/projects/library-assistant/05-library-assistant-chat.webp",
          w: 1600,
          h: 1000,
          alt: "The library assistant chat answering how many books a degree programme holds, with title and volume counts drawn from the live catalogue.",
          caption: "Library assistant"
        },
        {
          src: "assets/images/projects/library-assistant/06-collection-analysis.webp",
          w: 1600,
          h: 1000,
          alt: "Collection analysis dashboard showing volumes required against volumes held per degree programme, measured against the CHED and AACCUP standard.",
          caption: "Collection analysis"
        }
      ]
    }
  },
  achievements: {
    "ibalong-2026": {
      title: "Ibalong Festival Hackathon 2026",
      images: [
        {
          src: "assets/images/achievements/ibalong-2026/01-3rd-place-award-card.jpg",
          w: 1080,
          h: 1080,
          alt: "Heroes of Innovation Challenge 2026 announcement card: team Hackstreet Boys, 3rd place in the Bantong Award track, with a photo of the five members holding their certificate.",
          pos: "center 62%",
          caption: "3rd Place · Bantong Award"
        },
        {
          src: "assets/images/achievements/ibalong-2026/02-team-during-hackathon.jpg",
          w: 1280,
          h: 853,
          alt: "The five-member team at a round green table during the hackathon, laptops open, looking up from their code.",
          caption: "Build day · Hotel Lucca"
        },
        {
          src: "assets/images/achievements/ibalong-2026/03-team-at-venue.jpg",
          w: 1280,
          h: 960,
          alt: "The team seated together in event shirts at the hackathon venue, with other competing teams working in the background.",
          caption: "Legazpi City · 2026"
        },
        {
          src: "assets/images/achievements/ibalong-2026/04-certificates-and-prize.jpg",
          w: 1280,
          h: 1065,
          alt: "The team's certificates laid out on a green table: a certificate of recognition for 3rd place in the Bantong track, the prize card, and a certificate of participation for each member.",
          caption: "Certificates"
        },
        {
          src: "assets/images/achievements/ibalong-2026/05-team-selfie-with-certificates.jpg",
          w: 720,
          h: 1280,
          alt: "Selfie of the five team members outside the venue, each holding up their Heroes of Innovation Challenge certificate.",
          caption: "After the awarding"
        }
      ]
    },
    "ai4ai-2026": {
      title: "AI4AI Fair Vibe Coding Competition 2026",
      images: [
        {
          src: "assets/images/achievements/ai4ai-2026/01-hackstreet-boys-first-runner-up.webp",
          w: 1080,
          h: 1080,
          alt: "AI4AI Fair 2026 announcement card: team Hackstreet Boys, 1st runner-up in the Vibe Coding Competition, with a photo of the awarding on stage.",
          pos: "center 62%",
          caption: "1st Runner-up"
        },
        {
          src: "assets/images/achievements/ai4ai-2026/02-first-runner-up-trophy.webp",
          w: 743,
          h: 963,
          alt: "The clear acrylic 1st runner-up trophy held in one hand, etched with the AI4AI Fair 2026 Vibe Coding Competition award and date.",
          caption: "The 1st Runner-up trophy"
        },
        {
          src: "assets/images/achievements/ai4ai-2026/03-vibe-coding-banner.webp",
          w: 960,
          h: 640,
          alt: "Standee banners at the venue for the AI4AI Fair 2026 Vibe Coding Competition and the practical-AI sessions beside it.",
          caption: "AI4AI Fair 2026 · Vibe Coding Competition"
        },
        {
          src: "assets/images/achievements/ai4ai-2026/04-welcome-programmers-screen.webp",
          w: 1280,
          h: 854,
          alt: "Wall-mounted screen reading “Welcome programmers!” over the AI4AI Fair 2026 Vibe Coding Competition branding.",
          caption: "Welcome to the competition"
        }
      ]
    }
  }
};
