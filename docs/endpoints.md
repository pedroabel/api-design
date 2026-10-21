# Endpoints

Contract for `/v1`. The rules and the reasons live in [`decisions.md`](decisions.md). This file only says what each call looks like.

Paths are plural. JSON fields are camelCase. Every successful resource carries `links.self`. Authenticated calls send `Authorization: Bearer <token>`. `POST /v1/login` is the only route that accepts a missing token.

`Accept` may be omitted or set to `application/json`. Any other value is `406`.

## Shared shapes

List body:

```json
{
  "data": [],
  "links": { "self": "/v1/books?page=1&perPage=20", "next": "/v1/books?page=2&perPage=20" },
  "page": 1,
  "perPage": 20,
  "total": 42
}
```

`perPage` defaults to 20 and cannot exceed 100. `page` defaults to 1. `links.prev` and `links.next` appear only when that page exists.

Error body ([RFC 7807](https://www.rfc-editor.org/rfc/rfc7807)):

```json
{
  "type": "https://example.test/problems/no-copies",
  "title": "No copies available",
  "status": 409,
  "detail": "This book has no copies available to borrow."
}
```

`type` is a stable URI you own. The host above is a placeholder until you have one.

Sort values use the field name, with `-` for descending: `sort=title`, `sort=-title`, `sort=borrowedAt`, `sort=-borrowedAt`.

A book never includes a password. A member never includes a password or a password hash.

## Login

### `POST /v1/login`

No token.

Body: `email`, `password`.

`201` is wrong here. Success is `200` and returns the token plus the member id and role:

```json
{ "token": "<jwt>", "memberId": "1", "role": "member" }
```

| Status | When |
| --- | --- |
| 200 | Credentials match |
| 401 | Unknown email or wrong password |
| 422 | Email or password missing |
| 429 | More than 60 requests from this IP in the last minute |

The token expires in 60 minutes. Claims are the member id and the role.

## Books

Anyone with a token may read. Only a librarian may write or delete.

### `GET /v1/books`

Query: `title` (substring), `sort` (`title` or `-title`, default `title`), `page`, `perPage`.

`200`. Body is the list shape. Each item is a book. Response headers include `Cache-Control: public, max-age=60` and an `ETag`.

### `GET /v1/books/{id}`

`200` and the book, with the same cache headers. `404` when the id does not exist.

Book:

```json
{
  "id": "1",
  "title": "Dom Casmurro",
  "author": "Machado de Assis",
  "copiesOwned": 3,
  "copiesAvailable": 2,
  "links": { "self": "/v1/books/1" }
}
```

### `POST /v1/books`

Librarian. Body: `title`, `author`, `copiesOwned`. `copiesOwned` is an integer greater than or equal to 0. `copiesAvailable` is not accepted.

`201` and the created book. `403` for a member. `422` for a missing or invalid field.

### `PATCH /v1/books/{id}`

Librarian. Body may include any of `title`, `author`, `copiesOwned`. At least one field is required.

`200` and the updated book. `409` when `copiesOwned` is lower than the number of open loans. `404` when the book does not exist. `403` for a member. `422` for an invalid field.

### `DELETE /v1/books/{id}`

Librarian. `204` with an empty body. `409` when any loan, returned or not, points at the book. `404` when the book does not exist. `403` for a member.

## Members

### `GET /v1/members`

Librarian. `200` and the list shape. Default sort is `name` ascending. `403` for a member.

### `POST /v1/members`

Librarian. Body: `name`, `email`, `password`, `role` (`member` or `librarian`).

`201` and the member, without the password. `403` for a member. `409` when the email is already used. `422` for a missing or invalid field.

### `GET /v1/members/{id}`

A member may read their own record. A librarian may read any record.

`200` and the member. `403` when a member asks for someone else. `404` when the id does not exist.

Member:

```json
{
  "id": "1",
  "name": "Ada",
  "email": "ada@example.com",
  "role": "member",
  "links": { "self": "/v1/members/1" }
}
```

### `PATCH /v1/members/{id}`

Librarian. Body may include `name`, `email`, `role`. Password is not changed here.

`200` and the member. `409` when the new email belongs to another member. `403` for a member. `404` when the id does not exist. `422` for an invalid field.

### `POST /v1/members/{id}/password`

The member themselves. Body: `currentPassword`, `newPassword`.

`200` and the member. The existing token stays valid. `401` is reserved for a bad or missing token. A wrong `currentPassword` is `403`. `403` also when the caller is not that member, including a librarian. `422` when a field is missing. `404` when the id does not exist.

### `DELETE /v1/members/{id}`

Librarian. `204`. `409` when any loan points at the member. `404` when the id does not exist. `403` for a member.

## Loans

A member lists, reads, creates, and returns only their own loans. A librarian lists and reads every loan and may return any loan. A librarian does not create loans.

### `GET /v1/loans`

Query: `returned` (`true` or `false`), `sort` (`borrowedAt` or `-borrowedAt`, default `-borrowedAt`), `page`, `perPage`.

`200` and the list shape. A member's list contains only that member's loans. No extra query parameter can widen it.

### `POST /v1/loans`

Member. Optional header `Idempotency-Key`. Body:

```json
{ "bookId": "1" }
```

The server sets `borrowedAt` and `dueAt` (`borrowedAt` plus 14 days).

`201` and the loan, including `links.return` because it is still open.

The same caller, the same key, and the same body replay that original response for 24 hours, including the original status. The same key with a different body is `409`.

| Status | When |
| --- | --- |
| 201 | Loan created |
| 403 | Caller is a librarian, or the token's member may not borrow |
| 404 | `bookId` does not exist |
| 409 | No copies available, already 3 open loans, or an open loan of this book already exists |
| 422 | `bookId` missing |

### `GET /v1/loans/{id}`

`200` and the loan. `403` when a member asks for someone else's loan. `404` when the id does not exist.

Open loan:

```json
{
  "id": "10",
  "bookId": "1",
  "memberId": "1",
  "borrowedAt": "2026-10-20T18:00:00Z",
  "dueAt": "2026-11-03T18:00:00Z",
  "returnedAt": null,
  "links": {
    "self": "/v1/loans/10",
    "return": "/v1/loans/10/return"
  }
}
```

After return, `returnedAt` is set and `links.return` is absent.

### `POST /v1/loans/{id}/return`

Member who owns the loan, or any librarian. No body.

`200` and the loan with `returnedAt` set and no `links.return`. `409` when the loan was already returned. `403` when a member tries to return someone else's loan. `404` when the id does not exist.

## Calls that fail before the handler

| Status | When |
| --- | --- |
| 401 | Missing or invalid token on any route except login |
| 406 | `Accept` is present and is not `application/json` |
| 429 | More than 60 requests from this IP in the last minute |
| 400 | The body is not JSON when a body is required |
