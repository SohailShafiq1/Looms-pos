# Loom POS

Loom POS is an offline-first Electron desktop application for clothing shops. It stores business data in SQLite under Electron's `userData` directory and keeps privileged operations in the main process.

## Development

```bash
npm install
npm run dev
```

Run checks with `npm run typecheck` and `npm test`. Build the renderer and main process with `npm run build`. Windows packaging is configured through Electron Forge with `npm run make`.

The current foundation includes secure Electron defaults, first-launch shop signup, scrypt password hashing, login, SQLite migrations, and a dashboard shell. Product, stock, POS, receipts, reports, backups, and user-management workflows are being added on top of these boundaries. No demo sales or customer records are seeded.

## Data and backups

The live database is `loom-pos.sqlite` inside Electron's platform-specific `app.getPath('userData')` directory. Copy backups to a separate drive; local storage alone is not a backup strategy.
