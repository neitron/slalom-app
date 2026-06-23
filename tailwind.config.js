/**
 * Tailwind design tokens for the Slalom Tricks app.
 * Single source of truth for colors — keep in sync with reference/domain.js.
 *
 * Tailwind v4: this config still works if referenced from vite.config / postcss.
 * Alternatively express the same tokens via the `@theme` directive in src/style.css.
 *
 * The graph is raw SVG and sets stroke/fill from JS — domain.js exports the same hexes,
 * so SVG and Tailwind stay consistent. The CSS variables below are also handy for SVG.
 */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts}"],
  theme: {
    extend: {
      colors: {
        bg: "#14151a",
        card: "#1c1d24",
        "card-2": "#22232c", // bubbles, raised panels
        border: "#2a2b33",
        "border-2": "#32333e",
        fg: "#e6e6ec",
        muted: "#8b8b98",
        "muted-2": "#6e6f7a",
        accent: "#6f8cff",
        // rating traffic light
        "rate-good": "#3fbf75", // >= 4
        "rate-mid": "#e0a93e",  // >= 2.5
        "rate-bad": "#d95757",  // < 2.5
        "rate-none": "#565764", // unrated
        // portal leg colors
        "side-l": "#ffb36b",    // left  / orange
        "side-r": "#7cc5ff",    // right / blue
        "side-none": "#cbb3e6", // unspecified / lily
        // accents
        fav: "#ffd166",
        danger: "#c44545",
      },
    },
  },
  plugins: [],
};

/*
Add to src/style.css:

  @import "tailwindcss";

  :root {
    color-scheme: dark;
    --rate-good:#3fbf75; --rate-mid:#e0a93e; --rate-bad:#d95757; --rate-none:#565764;
    --side-l:#ffb36b; --side-r:#7cc5ff; --side-none:#cbb3e6;
  }

  @layer components {
    .rbtn   { @apply flex-1 py-2 rounded-lg border border-border-2 bg-card-2 text-fg text-sm cursor-pointer; }
    .rbtn:hover { @apply bg-accent text-bg border-accent; }
    .btn-l  { @apply text-side-l; border-color:#6b4a2c; }
    .btn-l:hover { @apply bg-side-l text-bg; border-color:#ffb36b; }
    .btn-r  { @apply text-side-r; border-color:#2c4a6b; }
    .btn-r:hover { @apply bg-side-r text-bg; border-color:#7cc5ff; }
  }
*/
