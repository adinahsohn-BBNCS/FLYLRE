# Fly LRE

Website for [flylre.com](https://www.flylre.com) — the pilots' page for Lake Riverside Estates (54CL).

**Adventure Begins at the End of the Runway.**

## Pages

- **Home** — minimal landing with links to the two main sections
- **Explore the Airport** — 54CL specs, guest access, pilot essentials
- **Plan Your Next Adventure** — suggested local fly-outs from LRE

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

1. Run `npm run build`
2. Connect via SFTP using credentials from your Liquid Web Site Dashboard
3. Back up the existing `html/` folder (optional)
4. Upload everything inside `dist/` to the web root
5. Verify [https://www.flylre.com](https://www.flylre.com)

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
