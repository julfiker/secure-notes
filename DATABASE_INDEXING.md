# Database Indexing & Query Optimization Guide

## 1. Executive Summary

In strict compliance with the project specification and critical constraints, only **five application-level indexes** are declared across the three Mongoose models (`User`, `Note`, and `Post`). 

Every index is explicitly declared via the `schema.index()` method in the respective model file to ensure complete visibility during technical code review.

```
┌─────────────────────────────────┬───────────────────────────────────────────┬───────────────────────────────────────────────┐
│ Collection                      │ Declared Schema Index                     │ Target Query / Operation                      │
├─────────────────────────────────┼───────────────────────────────────────────┼───────────────────────────────────────────────┤
│ Users                           │ { email: 1 } (unique: true)               │ Point-lookup for authentication & uniqueness   │
│ Users                           │ { createdAt: -1, _id: -1 }                │ Admin paginated user listing with tie-breaker │
│ Notes                           │ { userId: 1, createdAt: -1, _id: -1 }     │ User-specific paginated notes (ESR rule)      │
│ Notes                           │ { createdAt: -1, _id: -1 }                │ Admin global paginated notes listing          │
│ Posts                           │ { userId: 1, createdAt: -1, _id: -1 }     │ $lookup foreign key join & user post listing  │
└─────────────────────────────────┴───────────────────────────────────────────┴───────────────────────────────────────────────┘
```

---

## 2. Detailed Index Breakdown

### Index 1: Unique Email (Users Collection)

```typescript
userSchema.index(
  { email: 1 },
  { unique: true }
);
```

* **Collection:** `Users`
* **Query Supported:** 
  * `User.findOne({ email: input.email })` (Registration uniqueness check and Login credential lookup).
* **Operation Type:** Equality Matching + Unique Constraint Enforcement.
* **Field Order Rationale:** Single-field B-Tree index on `email` provides $O(\log N)$ lookup speed and enforces uniqueness at the database engine level, preventing race-condition duplicate registrations.
* **Execution Plan (`.explain("executionStats")`):**
  * **Stage:** `IXSCAN` followed by `FETCH`
  * **Index Name:** `email_1`
  * **Efficiency:** `totalDocsExamined: 1`, `nReturned: 1` ($1.0$ ideal ratio).

---

### Index 2: User Pagination (Users Collection)

```typescript
userSchema.index({
  createdAt: -1,
  _id: -1
});
```

* **Collection:** `Users`
* **Query Supported:** 
  * `User.find({}).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit)` (`GET /api/admin/users`).
* **Operation Type:** Sorting & Deterministic Pagination Scan.
* **Field Order Rationale:** 
  1. `createdAt: -1`: Scans newest users first without requiring a blocking in-memory sort (`SORT` stage). MongoDB aborts queries when an in-memory sort exceeds 32MB.
  2. `_id: -1`: Acts as a deterministic tie-breaker. If two user records share identical millisecond timestamps, pagination order remains stable, preventing duplicate or skipped records across pages.
* **Execution Plan (`.explain("executionStats")`):**
  * **Stage:** `IXSCAN`
  * **Index Name:** `createdAt_-1__id_-1`
  * **In-Memory Sort Stage (`SORT`):** None (Zero in-memory sorting overhead).

---

### Index 3: User-Specific Note Listing (Notes Collection)

```typescript
noteSchema.index({
  userId: 1,
  createdAt: -1,
  _id: -1
});
```

* **Collection:** `Notes`
* **Query Supported:** 
  * `Note.find({ userId: req.user.id }).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit)` (`GET /api/notes`).
* **Operation Type:** Equality Matching + Sorting.
* **Field Order Rationale (The ESR Rule):**
  * **E (Equality):** `userId: 1` is placed first. MongoDB navigates directly to the specific user's subtree.
  * **S (Sort):** `createdAt: -1` and `_id: -1` follow immediately. Documents within the user's subtree are already in the exact requested order.
  * **R (Range):** None.
* **Execution Plan (`.explain("executionStats")`):**
  * **Stage:** `IXSCAN`
  * **Index Name:** `userId_1_createdAt_-1__id_-1`
  * **Efficiency:** Bypasses all other users' notes; reads only the requesting user's paginated slice.

---

### Index 4: Global Note Listing (Notes Collection)

```typescript
noteSchema.index({
  createdAt: -1,
  _id: -1
});
```

* **Collection:** `Notes`
* **Query Supported:** 
  * `Note.find({}).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit)` (`GET /api/admin/notes`).
* **Operation Type:** Sorting across all notes in the database.
* **Field Order Rationale:**
  * When an Administrator views the global note feed, there is no `userId` filter.
  * Due to MongoDB's **leftmost prefix rule**, the compound index `{ userId: 1, createdAt: -1, _id: -1 }` cannot be used to sort documents when `userId` is omitted from the query.
  * Therefore, an index starting with `createdAt: -1` is strictly required to prevent a full collection scan and in-memory sort across the entire notes collection.
* **Execution Plan (`.explain("executionStats")`):**
  * **Stage:** `IXSCAN`
  * **Index Name:** `createdAt_-1__id_-1`

---

### Index 5: User-Specific Post Listing & $lookup (Posts Collection)

```typescript
postSchema.index({
  userId: 1,
  createdAt: -1,
  _id: -1
});
```

* **Collection:** `Posts`
* **Query Supported:**
  * Aggregation Scenario 2 `$lookup` stage:
    ```javascript
    {
      $lookup: {
        from: "posts",
        localField: "_id",
        foreignField: "userId",
        as: "posts"
      }
    }
    ```
  * Direct post listing: `Post.find({ userId }).sort({ createdAt: -1, _id: -1 })`.
* **Operation Type:** Foreign Key Equality Matching (`foreignField: "userId"`) + Sort Order.
* **Field Order Rationale:**
  * In the `$lookup` stage, MongoDB searches the `posts` collection for records where `userId == user._id`.
  * With `userId: 1` as the leading index key, MongoDB performs an `IXSCAN` on `posts` for each joined user, avoiding a catastrophic `COLLSCAN` on the posts collection.
* **Execution Plan (`.explain("executionStats")`):**
  * **Stage:** `IXSCAN`
  * **Index Name:** `userId_1_createdAt_-1__id_-1`

---

## 3. Why Additional Indexes Were Intentionally Omitted

1. **No Manual `_id` Index:**
   * MongoDB automatically creates a unique primary index on `{ _id: 1 }` for every collection. Declaring `schema.index({ _id: 1 })` would be redundant.
2. **No `interests` Multikey Index for Aggregation Scenario 1:**
   * In Aggregation Scenario 1, the pipeline groups **all users across the entire collection** by their interests (`User.aggregate([ { $unwind: "$interests" }, { $group: ... } ])`).
   * A full collection grouping operation must process every relevant user document. Adding an index on `interests: 1` would not prevent the collection traversal and would only incur write-overhead on every user update.
3. **No Redundant Single-field `userId` Index:**
   * Compound indexes with `userId` as the leading prefix (`{ userId: 1, createdAt: -1, _id: -1 }`) fully cover any query filtering by `userId` alone, making a standalone `{ userId: 1 }` index unnecessary.
4. **No `role` Index:**
   * Roles are checked via the decoded JWT payload and verified in the database via primary key lookup (`findById`). There is no query querying solely `{ role: 'ADMIN' }`.

---

## 4. Verification Script & Automated Tests

Automated query plan verification is implemented in [`backend/tests/phase6_indexes.test.ts`](file:///home/julfiker/Project/2026/task/backend/tests/phase6_indexes.test.ts).

Run the tests anytime with:
```bash
npm test tests/phase6_indexes.test.ts
```

All 5 declared indexes were verified to yield `IXSCAN` stages with zero unindexed sorting.

