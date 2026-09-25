# CarGo frontend

React + TypeScript + Vite + Tailwind CSS. Arabic (default, right to left) and English, light and dark mode, built mobile first.

## Run

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

The backend allows `http://localhost:5173` through CORS by default.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the built `dist/` |
| `npm run lint` | Lint with oxlint |

## Structure

| Path | Content |
|---|---|
| `src/i18n/` | Arabic (`ar.ts`) and English (`en.ts`) texts. Both files have the same keys. |
| `src/index.css` | Colors for light and dark mode (charcoal grey with white) |
| `src/components/layout/` | Header, footer, language and theme buttons |
| `src/components/ui/` | Reusable pieces such as `Button` |
| `src/pages/` | One file per page |
