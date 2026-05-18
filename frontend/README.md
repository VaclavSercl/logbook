# Logbook Frontend — Next.js PWA

## Quick Start

```bash
cd frontend
npm install
npm run dev
# http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Structure
```
frontend/
├── src/
│   ├── app/              # App router (pages)
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Dashboard
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── logbook/
│   │   ├── map/
│   │   ├── weather/
│   │   ├── crew/
│   │   ├── gallery/
│   │   ├── settings/
│   │   └── modules/
│   ├── components/       # Reusable components
│   │   ├── ui/           # shadcn/ui components
│   │   ├── layout/       # Sidebar, Header, Nav
│   │   ├── logbook/      # Logbook-specific
│   │   ├── map/          # Map components
│   │   └── ai/           # AI assistant
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities, API client
│   ├── stores/           # Zustand stores
│   ├── i18n/             # Localization
│   └── types/            # TypeScript types
├── public/
│   ├── manifest.json     # PWA manifest
│   ├── sw.js             # Service worker
│   └── icons/            # PWA icons
├── tailwind.config.ts
├── next.config.js
└── package.json
```
