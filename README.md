# OBSIDIAN

Collaborative editing made easy

## Local dev

### 1) Install
```bash
npm install
```

### 2) Start backend (API)
Set a password for the admin area (example):
```bash
export ADMIN_PASSWORD='choose-a-strong-password'
export SESSION_SECRET='choose-a-long-random-secret'
npm run dev:server
```

The API listens on `http://127.0.0.1:5175`.

### 3) Start frontend (Vite)
In a second terminal:
```bash
npm run dev
```

Open:
- Admin: `http://127.0.0.1:5173/`
- Customer link: created inside Admin (starts with `/r/<token>`)

## Build
```bash
npm run build
```

## Production (one process)
Build the frontend, then run the server which serves `dist/` and the API:
```bash
export NODE_ENV=production
export ADMIN_PASSWORD='choose-a-strong-password'
export SESSION_SECRET='choose-a-long-random-secret'
export HOST=127.0.0.1
export PORT=3005
export DATA_DIR=/var/lib/video-editor

npm run build
npm start
```
