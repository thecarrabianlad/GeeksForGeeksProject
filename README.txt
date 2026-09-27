NEXUS — Bennett University event landing page
================================================

FILES
  index.html          the page
  css/style.css        all styling
  js/script.js         scroll-scrub animation, nav, countdown, form
  assets/frames/       the background frame sequence (placeholder images)

HOW TO SWAP IN YOUR OWN BLENDER ANIMATION
  1. Render your Blender animation as an image sequence (PNG or JPG),
     not a video file. In Blender: Output Properties -> File Format ->
     PNG (or JPEG), then render the animation.

  2. Name the exported frames so they sort in order, for example:
        frame_001.png
        frame_002.png
        ...
        frame_120.png
     Blender's default numbering already works if you set the file
     name to "frame_" in the output path — it appends the frame
     number automatically.

  3. Delete the placeholder files in assets/frames/ and copy your own
     rendered frames into that same folder.

  4. Open js/script.js and edit the four constants at the very top:

        const FRAME_COUNT   = 131;        // <- how many frames you rendered
        const FRAME_PATH    = 'assets/frames/';
        const FRAME_PATTERN = 'frame_{n}';
        const FRAME_PAD     = 3;          // frame_001 = 3 digits
        const FRAME_EXT     = 'jpg';      // 'png' if you exported PNG

     Nothing else needs to change — the scroll animation reads these
     values automatically.

NOTES ON QUALITY VS. FILE SIZE
  - A 4-second clip at 24fps is 96 frames; at 30fps it's 120 frames.
    131 frames is fine either way — extra or fewer frames both work,
    just update FRAME_COUNT.
  - For a smooth scrub with a reasonable page weight, export at
    1920x1080 and save as JPEG at ~75-85% quality, or PNG if your
    animation has transparency or hard edges (larger files).
  - The canvas crops to fill the screen (like CSS object-fit: cover),
    so keep your subject roughly centered in the Blender frame.

EDITING CONTENT
  - Event date: search "14 November" in index.html (hero + facts strip +
    success message) and "2026-11-14" in js/script.js (EVENT_DATE
    constant) — update all of them together.
  - Everything else (highlight cards, schedule times, form fields) is
    plain HTML in index.html, no build step required.

HOSTING
  This is a static site — no server or build step needed. Open
  index.html directly, or upload the whole folder to any static host
  (GitHub Pages, Netlify, Vercel, etc.).
