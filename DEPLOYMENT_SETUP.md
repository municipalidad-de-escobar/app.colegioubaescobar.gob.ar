# Deployment Setup Guide: app.colegioubaescobar.gob.ar

GitHub Actions builds the React SPA and deploys to EC2 Apache on every push to `main`.

---

## Architecture

```
GitHub Repository
    ↓
GitHub Actions (Node 20: npm ci → npm run build)
    ↓  [6 VITE_FIREBASE_* secrets injected at build time]
dist/ bundle with baked-in Firebase credentials
    ↓
rsync to EC2 via SSH
    ↓
Apache: /var/www/app.colegioubaescobar.gob.ar
    ↓
Browser: SPA fallback routing (all paths → index.html → React Router)
```

**Key points:**
- No `.env` file on the server — env vars are baked into the bundle at build time
- No server process to restart — static files served by Apache
- No Node.js or npm required on EC2
- Access control is enforced by Firestore Security Rules and the `admins` collection whitelist

---

## Prerequisites

- EC2 instance running Apache 2.4+ on Amazon Linux (RHEL-based — Apache user/group is `apache:apache`)
- Firebase project configured (Firestore, Google Auth, security rules) — see `FIREBASE_SETUP.md`
- Local machine with SSH client (`ssh-keygen` available)
- GitHub repository with `Actions` enabled
- `sudo` access on EC2

---

## Step 1: EC2 — Create deploy user and web root

Run these commands on EC2 **as root or with sudo**:

```bash
# Create a locked-down system user for deployments
useradd --system --shell /bin/bash --create-home deploy-colegio

# Create web root with correct ownership
mkdir -p /var/www/app.colegioubaescobar.gob.ar
chown deploy-colegio:apache /var/www/app.colegioubaescobar.gob.ar

# setgid bit (2775): new files inherit apache group so Apache can always read them
chmod 2775 /var/www/app.colegioubaescobar.gob.ar

# Restrict deploy user's home directory
chmod 700 /home/deploy-colegio
```

---

## Step 2: SSH key pair

### 2a. Generate key pair (on your LOCAL machine)

```bash
ssh-keygen -t ed25519 -C "deploy-colegio@app.colegioubaescobar.gob.ar" \
  -f ~/.ssh/deploy_colegio -N ""
```

This creates:
- `~/.ssh/deploy_colegio` — private key (goes into GitHub Secrets, never committed)
- `~/.ssh/deploy_colegio.pub` — public key (installed on EC2)

### 2b. Install public key on EC2

```bash
# On EC2 (as root or sudo):
mkdir -p /home/deploy-colegio/.ssh
# Paste the contents of ~/.ssh/deploy_colegio.pub:
cat >> /home/deploy-colegio/.ssh/authorized_keys
# (paste key, then Ctrl+D)

chown -R deploy-colegio:deploy-colegio /home/deploy-colegio/.ssh
chmod 700 /home/deploy-colegio/.ssh
chmod 600 /home/deploy-colegio/.ssh/authorized_keys
```

### 2c. Test connection from LOCAL machine

```bash
ssh -i ~/.ssh/deploy_colegio deploy-colegio@<EC2-IP-or-hostname> "echo OK"
```

Should print `OK`. Debug with `ssh -vvv` if it fails.

---

## Step 3: Apache VirtualHost

### 3a. Create the config file

On EC2, create `/etc/httpd/conf.d/app.colegioubaescobar.gob.ar.conf` with:

```apache
# HTTP → HTTPS redirect
<VirtualHost *:80>
    ServerName app.colegioubaescobar.gob.ar
    Redirect permanent / https://app.colegioubaescobar.gob.ar/
</VirtualHost>

# HTTPS VirtualHost
<VirtualHost *:443>
    ServerName app.colegioubaescobar.gob.ar
    ServerAdmin admin@colegioubaescobar.gob.ar
    DocumentRoot /var/www/app.colegioubaescobar.gob.ar

    <Directory /var/www/app.colegioubaescobar.gob.ar>
        Options -Indexes
        AllowOverride None
        Require all granted

        # SPA fallback: unknown paths serve index.html so React Router handles them
        FallbackResource /index.html
    </Directory>

    # index.html: never cache (ensures browsers always get the latest app entry point)
    <FilesMatch "^index\.html$">
        Header set Cache-Control "no-cache, no-store, must-revalidate"
        Header set Pragma "no-cache"
        Header set Expires "0"
    </FilesMatch>

    # Hashed assets: cache forever (Vite fingerprints filenames — safe to cache permanently)
    <FilesMatch "\.(js|css|woff2?|ttf|otf|eot|png|svg|ico|jpg|jpeg|gif|webp)$">
        Header set Cache-Control "public, max-age=31536000, immutable"
    </FilesMatch>

    # Gzip compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript application/javascript application/json
    </IfModule>

    # Security headers
    Header set X-Content-Type-Options "nosniff"
    Header set X-Frame-Options "DENY"
    Header set X-XSS-Protection "1; mode=block"
    Header set Referrer-Policy "strict-origin-when-cross-origin"

    # SSL — Certbot will add certificate paths after running certbot --apache
    SSLEngine on
    SSLProtocol -all +TLSv1.2
    SSLCipherSuite HIGH:!aNULL:!MD5
    SSLHonorCipherOrder on

    ErrorLog /var/log/httpd/app.colegioubaescobar.gob.ar.error.log
    CustomLog /var/log/httpd/app.colegioubaescobar.gob.ar.access.log combined
</VirtualHost>
```

### 3b. Enable modules and site

```bash
sudo httpd -t   # must print "Syntax OK"
sudo systemctl reload httpd
```

---

## Step 4: DNS configuration (third-party action required)

**This step must be completed before Certbot can issue a certificate.** Let's Encrypt performs an HTTP-01 challenge, which requires the domain to resolve to the server.

Contact the DNS administrator for `escobar.gob.ar` and request the following record:

| Field | Value |
|---|---|
| **Type** | `A` |
| **Name** | `app.colegioubaescobar` (or `app.colegioubaescobar.gob.ar` — depends on their DNS panel) |
| **Value (IP)** | `52.2.17.12` |
| **TTL** | `3600` (1 hour) |

Once they confirm the record is created, verify propagation before proceeding:

```bash
# From any machine:
nslookup app.colegioubaescobar.gob.ar
# Should return: Address: 52.2.17.12

# Or:
dig app.colegioubaescobar.gob.ar +short
# Should print: 52.2.17.12
```

Propagation typically takes a few minutes but can take up to a few hours. Do not run Certbot until the domain resolves correctly.

---

## Step 5: HTTPS with Certbot

```bash
# Install Certbot if not already present
sudo dnf install -y certbot python3-certbot-apache

# Request certificate (say yes to automatic HTTPS redirect)
sudo certbot --apache -d app.colegioubaescobar.gob.ar
```

Certbot modifies the VirtualHost config to add SSL certificate paths and sets up auto-renewal.

Verify:
```bash
curl -I https://app.colegioubaescobar.gob.ar
# Returns 404 (no files yet) but HTTPS handshake succeeds
```

---

## Step 6: GitHub Secrets

In the GitHub repository go to **Settings → Secrets and variables → Actions** and create:

| Secret | Value | Source |
|---|---|---|
| `SSH_PRIVATE_KEY` | Full contents of `~/.ssh/deploy_colegio` | Local machine |
| `SERVER_HOST` | EC2 public IP or hostname | EC2 console |
| `DEPLOY_USER` | `deploy-colegio` | Fixed value |
| `VITE_FIREBASE_API_KEY` | Web API key | Firebase Console → Project settings → Your apps |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` | Firebase Console → Project settings |
| `VITE_FIREBASE_PROJECT_ID` | Project ID | Firebase Console → Project settings |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.firebasestorage.app` | Firebase Console → Project settings |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID | Firebase Console → Project settings |
| `VITE_FIREBASE_APP_ID` | App ID | Firebase Console → Project settings → Your apps |

See `FIREBASE_SETUP.md` for where to find each value in the Firebase Console.

The private key file starts with `-----BEGIN OPENSSH PRIVATE KEY-----` — copy the entire file content including those lines.

---

## Step 7: First deployment

**Automatic** — push to `main`:
```bash
git push origin main
```

**Manual** — go to **GitHub → Actions → Build & Deploy → Run workflow → main**.

Monitor the run in the Actions tab. Each step should show green:
1. Checkout + Node setup
2. Install dependencies (cached by `package-lock.json` hash)
3. Build (injects the 6 Firebase env vars, produces `dist/`)
4. Configure SSH (writes key, populates `known_hosts`)
5. Deploy via rsync (`--delete` removes stale chunks from previous builds)
6. Fix permissions (`755` dirs, `644` files)
7. Health check (3 attempts, 10s apart)
8. Cleanup (removes SSH key from runner — runs even on failure)

---

## Step 8: Verify

```bash
# HTTP response
curl -I https://app.colegioubaescobar.gob.ar
# → HTTP/2 200

# HTML content
curl -s https://app.colegioubaescobar.gob.ar | grep -o '<title>.*</title>'
```

In the browser:
- Login page should appear with "Ingresar con Google" button
- Google OAuth popup opens and redirects back to the app
- Only whitelisted accounts in the Firestore `admins` collection can sign in

---

## How deploys work (ongoing)

Every push to `main` runs `.github/workflows/deploy.yml`:

1. `npm ci` + `npm run build` — Vite produces `dist/` with code-split chunks (Firebase, PDF, Excel loaded on-demand)
2. `rsync dist/ → EC2:/var/www/…` — incremental, `--delete` removes old chunks
3. Permissions fixed (`755`/`644`) so Apache can read all files
4. Health check curls the live URL 3×

**No downtime:** Apache serves the old `index.html` while rsync runs. The moment the new file lands, the next browser reload gets the updated app.

---

## Troubleshooting

### `Permission denied (publickey)` at SSH step

The `SSH_PRIVATE_KEY` secret is wrong or the public key is missing from EC2.

```bash
# On EC2 — verify key is installed:
cat /home/deploy-colegio/.ssh/authorized_keys

# Locally — verify what the secret should contain:
cat ~/.ssh/deploy_colegio   # entire file, including BEGIN/END lines
```

### Health check fails but site is live

Apache was slow to start. Re-run the workflow (it's idempotent) or wait 30s and curl manually.

### App loads but Google login fails

1. Verify all 6 `VITE_FIREBASE_*` secrets are set correctly in GitHub Secrets
2. Firebase Console → Authentication → Sign-in method → Google must be enabled
3. `https://app.colegioubaescobar.gob.ar` must be listed in Firebase Console → Authentication → Settings → Authorized domains
4. Signing-in account must exist in the Firestore `admins` collection
5. For popup-blocked errors: ensure HTTPS is active (Google OAuth requires it)

### Files stuck on old version

Browser cache. Hard-refresh with `Ctrl+Shift+R` or open DevTools → Network → Disable cache → reload.

---

## Maintenance

```bash
# Renew HTTPS certificate manually (auto-renews every 60 days)
sudo certbot renew --force-renewal
sudo systemctl reload httpd

# Apache logs
tail -f /var/log/httpd/app.colegioubaescobar.gob.ar.error.log
tail -f /var/log/httpd/app.colegioubaescobar.gob.ar.access.log
```

**Rollback:** rsync `--delete` means old builds aren't kept on the server. To roll back, `git revert <bad-commit>` and push — GitHub Actions redeploys automatically.

---

## Security notes

- `SSH_PRIVATE_KEY` is only used by GitHub Actions — never commit it to the repo
- Firebase credentials (`VITE_FIREBASE_*`) are intentionally public (baked into the JS bundle, visible in DevTools) — security is enforced by Firestore Security Rules and the `admins` whitelist, not by keeping these values secret
- The `deploy-colegio` user can only write to `/var/www/app.colegioubaescobar.gob.ar` — it has no shell access to other directories
- Apache security headers (X-Content-Type-Options, X-Frame-Options, etc.) are set in the VirtualHost config above
