# RasaPilot

**Cultural intelligence for independent food businesses.** RasaPilot turns a restaurant or food startup brief into three menu hypotheses, an evidence ledger and a practical launch experiment.

## What it does

- Captures business type, city, intended audience, price range, cuisine direction, dietary constraints and optional favorite restaurants, brands, artists and films.
- Resolves optional references through Qloo Entity Search (`GET /search`).
- Requests location-aware place insights from Qloo Insights (`GET /v2/insights`) using only the Qloo entity IDs returned by search and documented locality parameters.
- Orchestrates five observable planning stages and returns three differentiated concepts, a comparison view and a launch plan.
- Keeps Qloo evidence separate from RasaPilot-generated menu, positioning, operational and marketing ideas.
- Uses clearly disclosed, local demonstration fixtures when no server-side Qloo key is present.

RasaPilot does not use an LLM. Its transparent planning agent is a deterministic orchestration and synthesis workflow. It does not claim that a Qloo affinity score represents purchase intent or menu demand.

## Stack

- Next.js App Router and TypeScript
- Tailwind CSS
- Node.js built-in test runner with `tsx`
- Qloo API v2 over server-side `fetch`

## Requirements

- Node.js 20.9 or newer
- pnpm 10.7 or newer (npm also works)
- A Qloo hackathon API key for live requests (optional for local demonstration mode)

## Run locally

```bash
pnpm install
Copy-Item .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Without a credential, the interface displays a demo-mode disclosure and uses the sample fixture objects. To make live requests, add your Qloo key to `.env.local`:

```dotenv
QLOO_API_KEY=your_key_here
QLOO_BASE_URL=https://hackathon.api.qloo.com
```

Restart the development server after changing environment variables. The API key is read only in server-side route handlers. It is never prefixed with `NEXT_PUBLIC_`, sent to client code, or returned by `/api/status`.

## API contract

| App route | Method | Purpose |
| --- | --- | --- |
| `/api/status` | GET | Reports `live` or `demo` mode based on server configuration. Presence is not a credential validity check. |
| `/api/qloo/search` | POST | Validates and resolves one reference (`place`, `brand`, `artist`, or `movie`). |
| `/api/qloo/insights` | POST | Requests local `urn:entity:place` results from a city and up to eight Qloo entity IDs. |
| `/api/plan` | POST | Validates a full brief and streams agent progress and the complete result as server-sent events. |

The default Qloo API origin is `https://hackathon.api.qloo.com`. Requests use `X-Api-Key`, a 12-second timeout, redirect rejection, a bounded response size, and no caching. Live errors are returned with a clear status and message; they never silently fall back to fixtures. The legacy `/recs` and `/recommendations` endpoints are not used.

Parameter choices follow the [Qloo Entity Search reference](https://docs.qloo.com/reference/entity-search), [Insights API deep dive](https://docs.qloo.com/reference/insights-api-deep-dive), and [authentication guide](https://docs.qloo.com/reference/api-onboarding-and-authentication).

For each reference, Entity Search requests `/search?query=…&types=urn:entity:<type>&take=5`. The Insights request uses:

- `filter.type=urn:entity:place`
- `filter.location.query=<city>`
- `signal.location.query=<city>`
- `signal.interests.entities=<IDs returned from search>` when references resolve
- `feature.explainability=true`
- `take=8`

Cuisine choices guide generated menu directions, but the app does not present them as Qloo-verified taste tags. Dietary and audience text are used in local synthesis and are not sent to Qloo. The public demo has no sign-in requirement; configure `QLOO_API_KEY` in the hosting platform's server environment for live results.

## Tests and checks

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Tests cover documented endpoint paths and parameters, `X-Api-Key` handling, safe response normalization, input validation, empty/unresolved evidence, constraint use, the live orchestration sequence and the progress/result stream. Qloo calls are mocked in the test suite. A passing local suite does **not** mean the configured credential or the hackathon API has been live-verified.

## Deploy to Vercel

1. Push this project to a public GitHub repository.
2. Import the repository in Vercel and keep the detected Next.js defaults.
3. Add `QLOO_API_KEY` and `QLOO_BASE_URL=https://hackathon.api.qloo.com` as server environment variables for the Production deployment. Do not add a `NEXT_PUBLIC_` prefix.
4. Deploy and check the `/api/status` response. It confirms configuration presence only.
5. Run an end-to-end plan with a valid key, then inspect the evidence ledger and deployment logs. Only describe the integration as live-verified after that actual request succeeds.

The app is intentionally public and unauthenticated for hackathon judging. Set the Qloo key through the hosting provider's secret manager, never in GitHub source or client environment variables.

## Evidence and demo behavior

Demonstration fixtures are deliberately namespaced with `demo:` IDs and carry no affinity scores. Their place names are illustrative, not Qloo entities. Each fixture result is labeled in the UI. A configured but rejected or expired key returns a visible upstream error instead of quietly using demo data.

In live mode, evidence rows are normalized from Qloo's returned entity envelope. Optional affinity values are displayed only when present in that response. The evidence query summary shows the parameters and input IDs used; it is not a substitute for a raw API response archive.

## License

MIT. See [LICENSE](./LICENSE).
