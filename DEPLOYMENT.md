# Kaveri Member Club • Production Deployment & Google Search Guide

This guide details the live public access, Google search engine indexing, free cloud hosting (Render / Railway), and VPS deployment for **Kaveri Electronic Halaguru**.

---

## 0. Live Public Internet Access & Credentials

The application is currently published to the public internet:

* **Public Web URL**: [https://kaveri-member-club.loca.lt](https://kaveri-member-club.loca.lt)
  *(If prompted for a Tunnel Password in your browser, enter: **`152.57.134.179`**)*
* **Admin Portal**: [https://kaveri-member-club.loca.lt/#admin](https://kaveri-member-club.loca.lt/#admin)
* **Owner Username**: `Prabhu_kaveri`
* **Owner Password**: `PrabhuSwamy@1987`
* **Official WhatsApp Group**: `https://chat.whatsapp.com/CIsTF8bPWOr9R94534QTSt?s=cl&p=a&mlu=4&ilr=4`

---

## 0.1 How to Make the Site Searchable on Google

To ensure customers in Halaguru, Kanakapura, and Karnataka find the store when searching Google for **"Kaveri Electronic Halaguru"** or **"Kaveri Member Club"**:

1. **Pre-Configured SEO Tags**:
   * The application already includes semantic HTML `<title>`, `<meta name="description">`, and OpenGraph tags.
   * Built-in `Schema.org` JSON-LD Structured Data specifies `ElectronicsStore` at *HMS Complex, Kanakapura Main Road, Halaguru*.
   * Crawler configuration files are live at `/robots.txt` and `/sitemap.xml`.

2. **Submitting to Google Search Console (Takes 2 minutes)**:
   * Go to **[Google Search Console](https://search.google.com/search-console)** and sign in with your Google Account.
   * Click **Add Property** $\rightarrow$ enter your site's URL (e.g. `https://kaverielectronics.in` or `https://kaveri-member-club.loca.lt`).
   * In the left menu, click **Sitemaps**.
   * Enter `sitemap.xml` in the "Add a new sitemap" box and click **Submit**.
   * Google's crawler will index your pages (`#register`, `#card`, `#preferences`, `#privacy`).

3. **Google Business Profile Integration**:
   * On your Google Maps / Google Business profile for *Kaveri Electronic Halaguru*, add the website link to your Member Club.
   * This immediately connects the physical store on Kanakapura Main Road to the digital loyalty club in Google Search.

---

## 1. Affordable Hosting Architecture (< ₹1,500 / month)

To keep recurring operational costs minimal for a single-store family business while ensuring enterprise-grade reliability and security:

| Service | Recommended Provider | Specs | Approx Cost |
|---|---|---|---|
| **Virtual Private Server (VPS)** | Hetzner Cloud (CX22) or DigitalOcean Basic Droplet | 2 vCPU, 4GB RAM, 40GB NVMe SSD, Ubuntu 24.04 LTS | ₹400 – ₹550 / mo ($4.50 – $6.00) |
| **Domain Name** | Namecheap / Porkbun / Cloudflare Registrar | `kaverielectronics.in` or `kavericlub.in` | ~₹800 / year (₹67 / mo) |
| **SSL / HTTPS Certificate** | Let's Encrypt via Caddy or Nginx Certbot | Automatic TLS renewal | **₹0 (Free)** |
| **Offsite Backups Storage** | Cloudflare R2 / Backblaze B2 | 10 GB Encrypted Daily Snapshots | **₹0 (Free Tier)** |
| **Estimated Total Infrastructure Cost** | | | **~₹500 – ₹650 / month** |

---

## 2. Server Provisioning Steps (Ubuntu 24.04 LTS)

### Step 1: Initial Server Hardening
```bash
# Update repositories
sudo apt update && sudo apt upgrade -y

# Create a non-root deployment user
sudo adduser deploy
sudo usermod -aG sudo deploy

# Configure UFW Firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### Step 2: Install Docker Engine & Compose
```bash
# Install Docker prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Allow deploy user to run docker
sudo usermod -aG docker deploy
```

---

## 3. Deploying the Application via Docker Compose

```bash
# Clone the repository into /opt/kaveri_member_club
cd /opt
sudo git clone <your-private-repo-url> kaveri_member_club
sudo chown -R deploy:deploy /opt/kaveri_member_club
cd /opt/kaveri_member_club

# Create production .env file
cp .env.example .env
chmod 600 .env

# Generate a strong SECRET_KEY:
openssl rand -hex 32
# Copy generated string into SECRET_KEY in .env
# Set secure POSTGRES_PASSWORD in .env

# Build and start services in the background
docker compose up -d --build
```

---

## 4. HTTPS & Reverse Proxy Configuration (Using Caddy)

Caddy automatically provisions and renews Let's Encrypt certificates without manual certbot cron jobs:

```bash
# Install Caddy on host
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
```

Create `/etc/caddy/Caddyfile`:
```caddy
kaverielectronics.in, www.kaverielectronics.in {
    # Reverse proxy to Docker Compose frontend on port 80
    reverse_proxy 127.0.0.1:80

    # Strict Security Headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    encode zstd gzip
}
```

Reload Caddy:
```bash
sudo systemctl reload caddy
```

---

## 5. Automated Daily Backups Setup

Set up an automated daily backup cron job:

```bash
# Make backup script executable
chmod +x /opt/kaveri_member_club/scripts/backup_db.sh

# Open crontab for root
sudo crontab -e
```

Add the following entry to trigger daily at 2:30 AM IST (21:00 UTC):
```cron
0 21 * * * /opt/kaveri_member_club/scripts/backup_db.sh >> /var/log/kaveri_backup.log 2>&1
```

---

## 6. Official WhatsApp Business Cloud API Integration

1. Go to [developers.facebook.com](https://developers.facebook.com) and create a **Business App**.
2. Add the **WhatsApp** product.
3. Link your official business phone number (e.g. `+91 94481 23456`).
4. Generate a **Permanent System User Access Token** in Meta Business Manager with permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
5. In `.env`, configure:
   ```env
   WHATSAPP_ENABLED=true
   WHATSAPP_API_TOKEN=EAAB...
   WHATSAPP_PHONE_NUMBER_ID=1234567890
   WHATSAPP_BUSINESS_ACCOUNT_ID=9876543210
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=<generate_secret_token>
   ```
6. In Meta App Dashboard, set the Webhook URL to:  
   `https://kaverielectronics.in/api/v1/webhooks/whatsapp`  
   and enter your verify token. Subscribe to the `messages` event.

---

## 7. Indian Telecom TRAI DLT SMS Registration

Under TRAI Commercial Communications regulations in India:
1. Register **Kaveri Electronic Halaguru** as a Principal Entity on any telecom operator DLT portal (e.g., Vilpower / Airtel DLT / Jio DLT).
2. Obtain your **Principal Entity ID** (19-digit number starting with `1201...`).
3. Register your Sender Header (e.g., **`KAVERI`**).
4. Register promotional message templates. Example:
   ```text
   Namaskara {#var#}, celebrate Diwali with Kaveri Electronic Halaguru! Get up to 15% off on LED TVs. Visit HMS Complex, Kanakapura Road. T&C Apply.
   ```
5. In `.env`, configure:
   ```env
   SMS_ENABLED=true
   SMS_PROVIDER=dlt_fast2sms
   SMS_API_KEY=<your_provider_api_key>
   SMS_SENDER_ID=KAVERI
   SMS_ENTITY_ID=1201000000000000000
   ```
