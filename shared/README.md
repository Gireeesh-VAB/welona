# shared

Code consumed by both `backend/` and `frontend/`.

- `src/enums.ts` — string-union enums (sales pipeline, cash, customer modules)
- `src/api/response.ts` — `SuccessBody<T>`, `ErrorBody`, `Meta` types
- `src/schemas/` — Zod validation schemas (used by routes for request parsing
  and by hooks/forms for client-side validation)
- `src/types/` — DTO types returned by the API

Imported via the `@shared/*` TypeScript path alias configured in each app's
`tsconfig.json`. No build step — TypeScript reads the source directly.

Files in here must not import server-only modules (`next/server`,
`@prisma/client`, `bcryptjs`, `jsonwebtoken`, `@/lib/db`, etc.). Zod is the
only runtime dependency.
