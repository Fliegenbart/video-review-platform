# Deploy auf Hetzner (vorsichtig)

Ziel: `video-editor.labpulse.ai` soll als **eigene, getrennte App** laufen, ohne andere Projekte auf dem Server zu beeinflussen.

Wichtig: Auf deinem Server hängen `:80` und `:443` bereits an einem Docker-Nginx (`voxdrop-nginx-1`). Deshalb bitte **nicht** `/etc/nginx/sites-*` verwenden, sondern den bestehenden Reverse Proxy sehr vorsichtig erweitern.

## 0) Wichtiger DNS-Check

Damit HTTPS (Let's Encrypt) funktioniert, muss der DNS A-Record auf `5.9.106.75` zeigen.

Check:

```bash
dig +short video-editor.labpulse.ai A
```

## 1) Ordner & User anlegen

Auf dem Server:

```bash
adduser --system --group --home /srv/video-editor video-editor
mkdir -p /srv/video-editor
mkdir -p /var/lib/video-editor
chown -R video-editor:video-editor /srv/video-editor /var/lib/video-editor
```

## 2) App-Code deployen

Einfachste Variante: Repository nach `/srv/video-editor` kopieren (z.B. per `rsync`).

Beispiel vom lokalen Rechner:

```bash
rsync -az --delete \
  --exclude node_modules \
  --exclude data \
  --exclude dist \
  --exclude .playwright-cli \
  --exclude output \
  ./ root@5.9.106.75:/srv/video-editor/
```

Dann auf dem Server:

```bash
cd /srv/video-editor
npm ci
npm run build
chown -R video-editor:video-editor /srv/video-editor
```

## 3) Secrets sicher ablegen

Datei anlegen: `/srv/video-editor/.env` (nur für `video-editor` lesbar)

```bash
cat >/srv/video-editor/.env <<'EOF'
NODE_ENV=production
HOST=0.0.0.0
PORT=3005
DATA_DIR=/var/lib/video-editor

# sehr wichtig: starkes Passwort + langes Secret
ADMIN_PASSWORD=CHANGE_ME
SESSION_SECRET=CHANGE_ME_TOO
EOF

chown video-editor:video-editor /srv/video-editor/.env
chmod 600 /srv/video-editor/.env
```

## 4) systemd Service (eigener Prozess)

Datei: `/etc/systemd/system/video-editor.service`

```ini
[Unit]
Description=Video Editor (labpulse) API
After=network.target

[Service]
Type=simple
User=video-editor
Group=video-editor
WorkingDirectory=/srv/video-editor
EnvironmentFile=/srv/video-editor/.env
ExecStart=/usr/bin/node /srv/video-editor/server/index.js
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
```

Dann:

```bash
systemctl daemon-reload
systemctl enable --now video-editor
systemctl status video-editor --no-pager
```

Health-Check:

```bash
curl -s http://127.0.0.1:3005/api/health
```

Wichtig (Firewall): Auf vielen Servern ist `ufw` aktiv und blockt alle Ports außer `22/80/443`.
Damit der Docker-Nginx (`voxdrop-nginx-1`) die App erreichen kann, musst du **nur intern** Zugriff erlauben,
z.B. für das Docker-Netz `172.18.0.0/16`:

```bash
ufw allow from 172.18.0.0/16 to any port 3005 proto tcp comment "video-editor internal"
```

## 5) Reverse Proxy: voxdrop-nginx (Docker) erweitern

Konfiguration liegt auf dem Host hier:
- `/opt/voxdrop/deploy/nginx.conf`

Die Nginx-Container-Konfig verwendet `/etc/letsencrypt` (Host) als `/etc/nginx/ssl` (Container).

Du fügst dort einen neuen `server { ... }` Block für `video-editor.labpulse.ai` hinzu (ähnlich wie `fluxengine.labpulse.ai`).

Beispiel (HTTPS):

```nginx
server {
    listen 443 ssl http2;
    server_name video-editor.labpulse.ai;

    ssl_certificate /etc/nginx/ssl/live/video-editor.labpulse.ai/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/video-editor.labpulse.ai/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 25G;

    # Wichtig: ohne trailing slash, sonst macht Nginx ggf. einen 301 Redirect auf /api/admin/projects/
    # und das kann POST-Requests kaputt machen.
    location /api/admin/projects {
        proxy_pass http://172.17.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_request_buffering off;
        proxy_buffering off;

        client_body_timeout 3600s;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 120s;
    }

    location / {
        proxy_pass http://172.17.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
    }
}
```

Danach in der Container-Umgebung reloaden:

```bash
docker exec voxdrop-nginx-1 nginx -t
docker exec voxdrop-nginx-1 nginx -s reload
```

Test (wenn DNS noch nicht umgestellt ist):

```bash
curl -I -H 'Host: video-editor.labpulse.ai' https://5.9.106.75/ -k | head
```

## 6) HTTPS (Let's Encrypt)

Erst wenn DNS auf `5.9.106.75` zeigt:

```bash
certbot certonly --webroot \
  -w /var/lib/docker/volumes/voxdrop_certbot-webroot/_data \
  -d video-editor.labpulse.ai
```

Danach Nginx auf `listen 443 ssl;` umstellen und `80 -> 443` redirect aktivieren.

## 7) Update-Workflow (später)

- Code per `rsync` aktualisieren
- `npm ci && npm run build`
- `systemctl restart video-editor`
