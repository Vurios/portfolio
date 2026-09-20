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

   Order is the display order: the finished result first, then the moment, then
   the supporting details. An item with a single image renders as a plain image
   with no carousel controls; an empty list falls back to the halftone
   placeholder, which is what the projects still waiting on screenshots use. */
var IMAGES = {
  projects: {
    saro: {
      title: "SARO",
      images: [
        {
          src: "assets/images/projects/saro/01-app-splash-screen.jpg",
          w: 1280,
          h: 593,
          alt: "SARO mobile app splash screen: the white house-and-pin logo above the SARO wordmark on deep navy.",
          caption: "App splash"
        }
      ]
    },
    argusph: {
      title: "ARGUSPH",
      images: []
    },
    safetrack: {
      title: "SafeTrack",
      images: [
        {
          src: "assets/images/projects/safetrack/01-title-slide-hazard-map.jpg",
          w: 968,
          h: 501,
          alt: "SafeTrack title card: the name, the tagline “a geo-reporting ecosystem for rural development”, and a map of Polangui pinned with colour-coded hazard markers.",
          caption: "Polangui hazard map"
        }
      ]
    },
    "library-assistant": {
      title: "Intelligent Library Assistant",
      images: []
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
          src: "assets/images/achievements/ai4ai-2026/01-1st-runner-up-award-card.jpg",
          w: 1080,
          h: 1080,
          alt: "AI4AI Fair 2026 announcement card: team Hackstreet Boys, 1st runner-up in the Vibe Coding Competition, with a photo of the awarding on stage.",
          pos: "center 62%",
          caption: "1st Runner-Up"
        },
        {
          src: "assets/images/achievements/ai4ai-2026/02-trophy-and-prize.jpg",
          w: 1280,
          h: 963,
          alt: "Hands holding the clear acrylic 1st runner-up trophy from the AI4AI Fair 2026 Vibe Coding Competition, next to the prize envelope.",
          caption: "The trophy"
        },
        {
          src: "assets/images/achievements/ai4ai-2026/03-competitors-coding.jpg",
          w: 1280,
          h: 854,
          alt: "Competitors coding side by side at a long desk during the eight-hour build window, laptops in a row.",
          caption: "Eight-hour build"
        },
        {
          src: "assets/images/achievements/ai4ai-2026/04-event-banners.jpg",
          w: 960,
          h: 640,
          alt: "Three pull-up banners at the venue for the AI4AI Fair 2026 Vibe Coding Competition and the Practical Applications of AI sessions.",
          caption: "At the venue"
        },
        {
          src: "assets/images/achievements/ai4ai-2026/05-welcome-screen.jpg",
          w: 1280,
          h: 854,
          alt: "Wall-mounted screen reading “Welcome programmers!” over the AI4AI Fair 2026 Vibe Coding Competition branding.",
          caption: "Competition day"
        },
        {
          src: "assets/images/achievements/ai4ai-2026/06-event-flyers.jpg",
          w: 960,
          h: 640,
          alt: "A fanned-out stack of AI4AI Fair 2026 flyers on a table.",
          caption: "Fair handouts"
        }
      ]
    }
  }
};
