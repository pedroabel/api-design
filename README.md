# api-design

A solo learning project to practice the concepts from the [API Design roadmap](https://roadmap.sh/api-design) by building a library REST API.

> **Project rule:** no code in this repository was written by AI. AI acts only as a mentor (questions, hints, and feedback). Every technical decision and all of the implementation are mine.

---

## Goal

Learn, hands-on, how to **design** an API: model resources, define contracts, handle errors, secure endpoints, version, document, and test. The focus is API design, not the product itself.

## Domain

A library where members borrow books.

### Resources

| Resource   | Description                        |
|------------|------------------------------------|
| `Author`   | Author of books                    |
| `Book`     | Book in the collection             |
| `Category` | Category/genre of books            |
| `Member`   | Person registered at the library   |
| `Loan`     | A book borrowed by a member        |

### Relationships

- An `Author` has many `Book` (1:N)
- `Book` and `Category` are many-to-many (N:N)
- A `Member` has many `Loan` (1:N)
- A `Book` has many `Loan` (1:N)

### Actions beyond CRUD

- Return a book
- Renew a loan

### Business rules

- A book with no available copy cannot be borrowed.
- A member has a limit of simultaneous loans.
- A loan that was already returned cannot be renewed.

## API consumers

- Web app for librarians
- Mobile app for members

Two user profiles, so two access levels.

## Out of scope

- Fines and payments
- Cover uploads
- Emails and notifications
- Front-end
- Deployment

---

## Study roadmap

- [ ] **Step 0 - Foundation:** repository, README, decision log, issues and milestones
- [ ] **Step 1 - Design before code:** endpoint table and OpenAPI contract
- [ ] **Step 2 - Core:** CRUD for the main resources
- [ ] **Step 3 - Errors and validation:** standardized error format
- [ ] **Step 4 - Collections:** pagination, filtering, and sorting
- [ ] **Step 5 - Authentication and authorization**
- [ ] **Step 6 - Versioning, caching, and rate limiting**
- [ ] **Step 7 - Testing and documentation**
- [ ] **Step 8 - Security:** review based on the OWASP API Security Top 10
- [ ] **Step 9 (optional) - Extras:** webhooks, async operations, GraphQL comparison

## API design

The endpoint contract is in [`docs/endpoints.md`](docs/endpoints.md). Implementation follows that file.

## Design decisions

Important decisions and their reasons are recorded in [`docs/decisions.md`](docs/decisions.md).

## How to run

> Fill in once the project is up.

## How to test

> Fill in once there are tests.

## What I learned

> Update at the end of each step.
