# Link Shrinker — Backend

REST API for a URL shortener. Accepts a long URL, returns a short code, and redirects visitors while counting hits.

![Node.js](https://img.shields.io/badge/Node.js-Express_5-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![Render](https://img.shields.io/badge/Deployed-Render-46E3B7?logo=render&logoColor=white)

> **Frontend:** [url-shortener-frontend](https://github.com/EnnilavanSV/url-shortener-frontend) · [live app](https://url-shortener-frontend-lemon-seven.vercel.app)

---

## Live API

```
https://my-url-shortener-ap.onrender.com
```

> **First request is slow.** Free-tier Render spins the instance down after inactivity, so the first call after an idle period takes roughly 50 seconds to wake it.

Try it:

```bash
curl -X POST https://my-url-shortener-ap.onrender.com/api/shorten \
  -H "Content-Type: application/json" \
  -d '{"originalUrl":"https://github.com/EnnilavanSV"}'
```

```json
{
  "originalUrl": "https://github.com/EnnilavanSV",
  "shortCode": "a3f9c1",
  "clicks": 0,
  "createdAt": "2026-06-23T10:14:02.331Z",
  "_id": "..."
}
```

Then open `https://my-url-shortener-ap.onrender.com/a3f9c1` and you'll land on the original URL, with `clicks` incremented.

---

## How it works

Two routers, mounted in a deliberate order:

```js
app.use("/api", urlRoutes);     // POST /api/shorten
app.use("/", indexRoutes);      // GET  /:shortCode
```

`indexRoutes` owns `GET /:shortCode`, which matches *any* single path segment. Mounting it last means it acts as a catch-all — `/api` is claimed first, so an API call is never mistaken for a short code.

The redirect handler looks up the code, increments the counter, and hands back a 302:

```js
urlDocument.clicks++;
await urlDocument.save();
return res.redirect(urlDocument.originalUrl);
```

---

## Data model

```js
{
  originalUrl: { type: String, required: true },
  shortCode:   { type: String, required: true, unique: true },
  clicks:      { type: Number, required: true, default: 0 },
  createdAt:   { type: Date, default: Date.now },
}
```

`unique: true` on `shortCode` creates a MongoDB unique index — the database itself refuses duplicates, independent of any application check. That matters, and the reason is in the notes below.

---

## API reference

### `POST /api/shorten`

```json
{ "originalUrl": "https://example.com/a/very/long/path", "customCode": "my-link" }
```

`customCode` is optional. Omit it and the server generates one.

| Status | Meaning |
|---|---|
| 201 | Created — returns the full URL document |
| 400 | Missing `originalUrl`, or the requested `customCode` is taken |
| 500 | Server error |

### `GET /:shortCode`

| Status | Meaning |
|---|---|
| 302 | Redirect to the original URL, `clicks` incremented |
| 404 | No such short code |
| 400 | Code exists but has no stored URL (corrupt record) |

---

## Engineering notes

### Generating short codes

```js
shortCode = crypto.randomBytes(3).toString("hex");
```

Three random bytes rendered as hex give a 6-character code — short enough to type, and `crypto` rather than `Math.random()` because codes shouldn't be guessable in sequence.

The tradeoff is worth stating plainly: 3 bytes is 16,777,216 possible codes, but collisions don't wait for the space to fill. By the birthday paradox they become likely at roughly √16.7M ≈ **4,000 stored URLs**. At that point the unique index rejects the insert and the request fails. See Known limitations for what fixes it.

### Custom aliases are checked before insert

```js
const existingUrl = await url.findOne({ shortCode: customCode });
if (existingUrl) {
  return res.status(400).json({ error: "That custom code is already in use. Please choose another." });
}
```

This exists for the error message, not for correctness. The real guarantee is the unique index — a check-then-write has a gap between the two operations where a second request can slip in and claim the same code. The application check handles the common case with a helpful message; the database handles the race.

### Failing fast on a bad database connection

```js
catch (error) {
  console.error(error.message);
  process.exit(1);
}
```

A server that starts without a database accepts requests and fails every one of them with a 500. Exiting instead means the hosting platform reports a failed deploy — an obvious problem rather than a silently broken service.

---

## Running locally

**You'll need:** Node 18+ and MongoDB (local or Atlas).

```bash
git clone https://github.com/EnnilavanSV/url-shortener-backend.git
cd url-shortener-backend
npm install
```

`.env`:

```env
PORT=5000
MONGO_URL=mongodb://127.0.0.1:27017/url-shortener
```

```bash
node server.js       # → http://localhost:5000
```

| Variable | Description |
|---|---|
| `PORT` | Port to listen on (defaults to 5000) |
| `MONGO_URL` | MongoDB connection string |

---

## Known limitations

- **Collisions aren't retried.** A generated code that already exists throws a duplicate-key error and returns 500. The fix is a loop: generate, attempt insert, regenerate on duplicate, up to a few attempts. Widening to `randomBytes(5)` also pushes the collision threshold from thousands to millions.
- **Click counting isn't atomic.** `clicks++` followed by `save()` is a read-modify-write — two simultaneous visits can both read the same value and write the same result, losing a count. `findOneAndUpdate({ shortCode }, { $inc: { clicks: 1 } })` increments inside the database and can't be lost.
- **`originalUrl` isn't validated.** Only presence is checked. Anything that isn't a real `http(s)` URL is stored and later handed to `res.redirect()`.
- **Custom codes aren't constrained.** No length limit, no character restriction, and no reserved-word list — nothing stops someone claiming `api`, `admin` or a 500-character alias.
- **It's an open redirect,** which is inherent to URL shorteners but real: anyone can mint a link on this domain pointing anywhere, which is useful for phishing. Production shorteners answer this with domain blocklists and abuse reporting.
- **No rate limiting.** Nothing prevents a script creating unlimited links.
- **Clicks are recorded but never exposed.** Every redirect increments the counter and no endpoint returns it, so the data is collected and unreadable.
- **CORS is fully open** (`app.use(cors())`), and there are **no automated tests**.
- **Unused imports.** `crypto` and the `url` model are imported in `server.js` but only used inside the route files.

## Roadmap

- [ ] Retry on collision, and widen codes to `randomBytes(5)`
- [ ] Atomic `$inc` for click counting
- [ ] Validate `originalUrl` and constrain custom codes, with a reserved-word list
- [ ] `GET /api/stats/:shortCode` so the click data is usable
- [ ] Rate limiting and a CORS allowlist
- [ ] Optional expiry dates on links

---

## Author

**Ennilavan SV** — MERN stack developer

[GitHub](https://github.com/EnnilavanSV) · [LinkedIn](https://www.linkedin.com/in/ennilavan-sv-09a151340) · [Portfolio](https://personal-portfolio-kappa-topaz-a13ieb812t.vercel.app/)
