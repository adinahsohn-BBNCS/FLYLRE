# Fly LRE

Website for [flylre.com](https://www.flylre.com) — the pilots' page for Lake Riverside Estates (54CL).

**Adventure Begins at the End of the Runway.**

## Pages

- **Home** — minimal landing with links to the two main sections
- **Explore the Airport** — 54CL specs, guest access, pilot essentials
- **Plan Your Next Adventure** — suggested local fly-outs from LRE
- **Meet the Planes** — community profiles (submissions reviewed before publishing)
- **Events** — community calendar (submissions reviewed before publishing)

## Pilot profile submissions (Supabase)

Submissions are saved in [Supabase](https://supabase.com). You approve or reject them online — no code edits needed.

### One-time Supabase setup

1. Open your project → **SQL Editor** → paste and run `supabase/schema.sql`
2. **Authentication → Providers** → enable **Email**
3. **Authentication → Users → Add user** — create your admin login (email + password)
4. Copy `.env.example` to `.env` and set:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY` (publishable key only — never the secret key)

### Daily use

| Who | Where |
|---|---|
| Residents submit profiles | `/meet-the-planes/` |
| Anyone submits an event | `/events/` |
| You manage both | `/admin/` |

**Approve** publishes the profile on Meet the Planes immediately. **Reject** removes it from the pending queue. The **Live on Meet the Planes** section lets you edit approved profiles or remove them from the public page.

When someone submits a form, an email is sent to **info@flylre.com** (via FormSubmit) with details and a link to `/admin/`. The first FormSubmit delivery may require a one-time activation click in that inbox.

Before deploying, run `npm run build` with `.env` present so Supabase keys are included in the site.

## Event submissions (Supabase)

Same approval workflow as pilot profiles. If your database was set up before Events was added, run `supabase/events.sql` once in the SQL Editor.

For event **RSVPs** and **photo uploads**, run `supabase/event-rsvps-photos.sql` once in the SQL Editor. Approved RSVPs update the public guest count; approved photos appear in each event’s gallery. Review both under **Admin → Events**.

## Development

Requires [Node.js](https://nodejs.org/) (LTS recommended).

```bash
npm install
npm run dev
```

Open [http://localhost:4321](http://localhost:4321).

## Build for production

```bash
npm run build
```

Static files are output to `dist/`. Upload the contents of `dist/` to your Liquid Web hosting via SFTP (replace WordPress files in the site's `html/` directory).

## Deploy to Liquid Web (Spark Launch)

### One-time setup

1. In [Liquid Web Site Dashboard](https://manage.liquidweb.com) → your site → **SFTP/SSH**, copy host, username, and password.
2. Copy `.env.deploy.example` to `.env.deploy` and fill in your SFTP credentials.
   On Nexcess Spark Launch, the web root is usually:
   `/chroot/home/YOUR_ACCOUNT/flylre.com/html`
3. Ensure `.env` has Supabase and weather keys, then run a production build (deploy runs this automatically).

### Deploy (replace WordPress with the new site)

```powershell
npm run deploy
```

This will:

1. Run `npm run build`
2. Connect via SFTP to your `html/` folder
3. **Delete all existing files** (old WordPress site)
4. Upload everything from `dist/`

Verify [https://www.flylre.com](https://www.flylre.com) when finished.

**Optional:** Download a backup of the current `html/` folder from Liquid Web File Manager before deploying.

### Manual upload (FileZilla)

1. Run `npm run build`
2. Connect with SFTP credentials from Liquid Web
3. Open the remote `html/` folder
4. Delete old WordPress files (`wp-admin`, `wp-content`, `wp-includes`, `*.php`, etc.)
5. Upload **contents** of local `dist/` (not the `dist` folder itself)

## GitHub

Push this repo to GitHub as **FLYLRE**, then connect your local workflow:

```bash
git init
git add .
git commit -m "Initial Fly LRE site"
git remote add origin git@github.com:YOUR_USERNAME/FLYLRE.git
git push -u origin main
```

## Contact

Site contact: [info@flylre.com](mailto:info@flylre.com)

Visitors welcome with prior permission from residents.
