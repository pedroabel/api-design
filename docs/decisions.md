# Design decisions

This file records the contract for the lending API and the choices that produced it. It is the source of truth until the code exists. The code should follow this file. If a later change disagrees with it, update this file first.

## How these decisions were made

The choices below were not generated as a finished design. They were reached with the Matt Pocock **grilling** skill (`grill-me`).

That skill treats a design as a tree. A round asks only the questions whose earlier answers are already settled. Each question includes a recommended answer. The next round starts only after those answers are in. A later answer can reopen an earlier branch, which happened here more than once: the domain was cut down to three resources, authentication was postponed, and then the whole roadmap was put back in scope.

The recommendations were accepted explicitly, except where this file names a different choice. The rejected alternatives stay in the text so the reason is still visible later.

The skill stops at a shared understanding. It does not choose a library the roadmap never mentions, and it does not write the implementation.

## Goal

Build a small lending API in order to practice the [API Design roadmap](https://roadmap.sh/api-design) by writing and running the artifacts myself.

The lending API is done only when both of these are true:

- The Building JSON / RESTful APIs column is in place, including HATEOAS.
- Authentication and authorization are in place on that same API.

Other roadmap nodes still get an artifact, after that API works. They are not extra products stuffed into the first server.

## Stack

| Choice | Decision | Why |
| --- | --- | --- |
| Language | TypeScript | Chosen directly. The roadmap does not name a language. |
| HTTP library | Node.js `http` | The method, path, status, and body stay in your code. |
| Database | SQLite, one file | Three resources do not need a database server. |
| Password storage | A slow hash (bcrypt or Argon2) | The API never returns the hash or the plain password. |

Express bundled with SQLite was recommended and rejected. SQLite stayed.

## Domain

`Book` is the work in the catalog, not a physical copy. Three copies of the same work are one book. A loan does not record which physical object left the shelf.

Availability is two numbers on the book:

- `copiesOwned` is set by a librarian. The update is rejected when the new value is lower than the number of loans that are not yet returned.
- `copiesAvailable` is computed (`copiesOwned` minus those open loans). Clients cannot send it.

`Member` is one person. `role` is `member` or `librarian`. A librarian may borrow under the same loan rules as a member.

`Loan` records one member borrowing one book.

There is no `Author` resource, no `Category` resource, and no renew action. The author is text on the book. Those cuts keep the first contract small. The roadmap lessons come from HTTP behavior, not from more entities.

### Loan rules

The server sets `borrowedAt` to now and `dueAt` to 14 days later. The client sends only the book id. The client never sends `returnedAt`.

Create is refused when:

- `copiesAvailable` is 0.
- The member already has 3 loans that are not returned.
- The member already has an open loan of that same book.

Return is an action with no body. It sets `returnedAt` to now. Calling it again fails. An overdue loan can still be returned. There is no fine.

A librarian may delete a book or a member only when no loan points at it, including loans already returned. Returned loans are the history. Deleting either side would erase that history or leave a dangling loan.

### Fields

JSON is camelCase. Paths are plural nouns.

| Resource | Fields |
| --- | --- |
| Book | `title`, `author` (text), `copiesOwned`, `copiesAvailable` |
| Member | `name`, `email`, `role` |
| Loan | `memberId`, `bookId`, `borrowedAt`, `dueAt`, `returnedAt` |

`email` is required, unique, and is the login name. A member may read their own record and change their own password. Only a librarian may change `name`, `email`, or `role`.

## Who can call what

Login is the only route that does not require a token. Every other route requires a valid JWT.

| Action | Member | Librarian |
| --- | --- | --- |
| Read books | yes | yes |
| Create or edit books, change `copiesOwned` | no | yes |
| Create members, edit another member, set `role` | no | yes |
| Create a loan | only for themselves | no |
| List and read loans | only their own | all |
| Return a loan | only their own | any |

A librarian does not check books out. The member id on a new loan comes from the token. The body does not carry a member id.

## HTTP contract

All lending routes live under `/v1`. A breaking change later is `/v2`. Only v1 is built now.

Responses are JSON. If `Accept` is missing or is `application/json`, the request proceeds. Any other value returns `406`.

CORS allows one origin from configuration. The default is `http://localhost:3000`. Allowed request headers are `Authorization`, `Content-Type`, `Accept`, and `Idempotency-Key`.

### Lists

List bodies are `data`, `links`, `page`, `perPage`, and `total`.

`perPage` defaults to 20 and cannot exceed 100. The default page is 1.

| Collection | Filter | Sort | Default sort |
| --- | --- | --- | --- |
| Books | `title` substring | `title` ascending or descending | title A–Z |
| Loans | `returned=true` or `false` | `borrowedAt` ascending or descending | newest first |

The title filter is the search feature for this API. Offset paging is the paging feature. Cursor paging is a later roadmap exercise, not a second system inside v1.

### HATEOAS

- Every resource includes `links.self`.
- A collection includes `links.self`, and includes `next` and `prev` only when that page exists.
- A loan includes `links.return` only while `returnedAt` is empty.

Links advertise what is valid now. A returned loan does not offer return.

### Idempotency, cache, and rate limit

`Idempotency-Key` is optional on loan creation. The same caller, the same key, and the same body replay the original response for 24 hours. The same key with a different body fails. Another caller may use the same key string.

Book reads send `Cache-Control: public, max-age=60` and an `ETag`. The book payload does not vary by caller, so the cache is public.

The whole API allows 60 requests per minute per IP. Over the limit, the status is `429`.

### Status codes

Errors use [RFC 7807](https://www.rfc-editor.org/rfc/rfc7807) (`type`, `title`, `status`, `detail`).

| Status | When |
| --- | --- |
| `400` | Malformed JSON |
| `401` | Missing or invalid token |
| `403` | Wrong role, or a member touching someone else's loan |
| `404` | Missing record |
| `406` | Unsupported `Accept` |
| `409` | The body is valid and the current state refuses it: no copies, 3 open loans, same book already borrowed, loan already returned, `copiesOwned` below the open-loan count, or an idempotency key reused with a different body |
| `422` | A field is missing or invalid |
| `429` | Rate limit |
| `201` | Create |
| `200` | Read, update, return |
| `204` | Delete |

`422` means the request itself is wrong. `409` means the library state will not allow it.

### Authentication

Login returns a JWT. The token expires in 60 minutes. Its claims are the member id and the role. There is no refresh token.

A librarian creates each member and a starting password. The member can change that password later. Changing the password does not revoke a token already issued. That limit stays until a later exercise.

The first librarian is created by a seed from values outside the app (email, name, password) when the database has no users. There is no public sign-up.

Basic auth, cookie sessions, opaque tokens, and OAuth are later samples. They are not the login this API uses. JWT won because both clients are first-party. OAuth is for a third party calling the API on a user's behalf, and this project does not have that caller.

## Roadmap order

1. Lending API, including the REST column and JWT authorization as specified above.
2. Samples for the other authentication methods.
3. Separate exercises for SOAP, gRPC, GraphQL, WebSockets, and server-sent events.
4. Short notes that apply concept nodes to this API: TCP, DNS, and the compliance topics. Those notes are not running subsystems.

Each protocol exercise should stay out of the lending server. One process that speaks REST, GraphQL, gRPC, and SOAP at once was rejected because every change would cost four protocols.

## What was rejected

- `Book` as a physical copy, and a separate copy resource. Counts on the work are enough, and a loan does not identify a physical object.
- Two JSON shapes for librarian and member. The same fields are returned. Access differs by which routes each role may call.
- A public register endpoint.
- Client-supplied due dates.
- Unlimited renewals, or any renew action, in this API.
- HATEOAS links for actions that are not currently valid.
- A fake identity header in place of real authentication.
- A global idempotency key shared by every caller.
- `400` for every failure.
- Page metadata only in headers.
- CORS opened to every origin.
