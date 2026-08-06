# SGD Electric — admin panel

Content management for the SGD Electric website: banners, team, gallery,
reviews, contact details, and the enquiries the public contact form produces.

## Running it

Two processes, in two terminals.

```
cd server
npm install
npm run seed     # first time only — imports the live site content
npm run dev      # API on http://localhost:4000
```

```
cd client
npm install
npm run dev      # panel on http://localhost:5175
```

Sign in with the account the seed prints:

```
username  admin123
password  password123
```

The username is not an email address — the account is identified by whatever
string it was created with.

To change either later:

```bash
node src/set-admin.js <username> <password>
```

**Change both, and set `JWT_SECRET`, before this is reachable from the
internet.** These defaults are in this repository, so on a public host anyone
who has read the source can sign in and edit the website. Both are called out
at boot.

## How it fits together

| | |
|---|---|
| `server/` | Express API. Reads are public so the website can render from them; every write needs a bearer token. |
| `client/` | The panel. React, and nothing but a client of the API. |
| `server/data/db.json` | The database. One file, written atomically. |
| `server/uploads/` | Uploaded images, served at `/uploads`. |

Everything goes through `server/src/store.js`, so replacing the JSON file with
Postgres means rewriting that one module.

### Why a JSON file

`better-sqlite3` needs a native build and there is no MSVC toolchain on this
machine. At this scale — a few dozen rows, one editor — a file is genuinely
adequate: every read is served from memory, and writes go to a temp file and
are renamed into place, so a crash mid-write cannot leave a torn database.

## The API

| Method | Path | Auth |
|---|---|---|
| `GET` | `/api/banners \| team \| gallery \| reviews` | public — add `?active=1` for only what is visible |
| `POST` `PUT` `DELETE` | same paths | token |
| `POST` | `/api/{resource}/reorder` | token — body `{ ids: [...] }` |
| `GET` `PUT` | `/api/contact` | read public, write token |
| `POST` | `/api/enquiries` | public — this is what the website's contact form posts to |
| `GET` `PUT` `DELETE` | `/api/enquiries` | token |
| `POST` | `/api/login`, `/api/upload` | — / token |

## What is not done yet

- **The website still reads its own static files.** The API serves this content
  but nothing consumes it — pointing the site at `/api/…` is the next step, and
  until then edits made here do not change the public site.
- **One account, and no password reset.** Both are server work.
- **Uploads are stored on disk** beside the API. Fine on one machine; a second
  server would need shared storage or S3.
- **No audit trail.** Who changed what is not recorded.
