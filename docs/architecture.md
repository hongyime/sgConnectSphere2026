# Architecture boundary

The product scope and stack are undecided. This document states boundaries rather
than claiming an implementation exists.

```mermaid
flowchart LR
    User[User's browser] --> Frontend[Frontend]
    Frontend --> API[Backend API]
    API --> Data[Database or persistence]
```

The frontend owns presentation and browser interaction. The backend owns trusted
validation, authorization, business rules, and persistence. Browser validation
improves usability but never replaces server-side validation or authorization.

Frontend and backend live in one repository and may deploy independently. Avoid
importing backend internals directly into the frontend. Define a versioned API
contract; OpenAPI is an option for different languages, while a shared schema
package may suit TypeScript throughout. Share code only when a real common need
exists. Validate untrusted input at runtime even if types are shared.

Keep environments and secrets separate. Database migrations and synthetic seed
data belong in version control. Production data and credentials do not.

Record language/framework, API-contract, database, authentication, hosting, and
package-manager choices in decision records before adding their infrastructure.

## Event request date horizon (SCRUM-180)

Event request submission uses the Singapore calendar date plus two calendar
years in `eventLifecycle/dateHorizon.ts`. Validation precedes persistence on
create and draft submission; failed PATCH validation returns one structured 400
through `respondWithResult`. Draft saves may retain farther dates. The sole
default Session mirrors the Event range; independent Session validation remains
an E04 integration dependency. See [the contract](contracts/event-date-horizon.md).
