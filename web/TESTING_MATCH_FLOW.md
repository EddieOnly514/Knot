# Match flow test: no match → 1:1 → 3-person GC → 4-person GC (max) → 4th blocked

Group can have **at most 4 people** (including the host). Use this to verify the full progression and the cap.

## Setup

1. **Seed test data**  
   On the login page, use **“Fill group chat test account”** (or `POST /api/seed-matches`) so the DB has the flow-test route.

2. **Log in as the host**  
   Email: **david@knot-test.dev**  
   Password: **KnotTest2026!**

3. **Route**  
   David has one offering: **SFO → Stanford**, with **4 pending** requests (Sophia, Alex, Jordan, Taylor). No one is accepted yet.

---

## Steps

### 1. No match

- Go to **Home**. You should see **4 incoming requests** (Sophia, Alex, Jordan, Taylor).
- Go to **Messages**. It should be **empty** (no conversations yet).

### 2. One match (1:1 chat)

- **Home** → accept **Sophia**’s request (Accept).
- You should be redirected to **Messages** and see **one conversation** (1:1 with Sophia).
- Open it: **1:1 chat** with Sophia; no “Group” label.

### 3. Two matches (3-person group chat)

- **Home** → accept **Alex**’s request.
- **Messages** should now show **one thread**: **Group (3)** (David + Sophia + Alex).
- Open it: **group chat** with 3 people; “View members” shows David, Sophia, Alex.

### 4. Three matches (4-person group chat — max)

- **Home** → accept **Jordan**’s request.
- **Messages** → **Group (4)** (David + Sophia + Alex + Jordan). Open it: 4 people. Group is now at **max** (4 people total; cap is host + 3 accepted).

### 5. Accept 4th person (not allowed)

- **Home** → find **Taylor**’s request and tap **Accept**.
- You should see a **toast**: *“Reached max ride limit. Group can have at most 4 people.”*
- Taylor’s request should **stay pending** (not accepted).
- **Messages** still shows **Group (4)**; Taylor is not in the group.

---

## Checklist

- [ ] **1. No match** — Home: 4 pending; Messages: empty.
- [ ] **2. One match** — Accept Sophia → 1:1 chat with Sophia only.
- [ ] **3. Two matches** — Accept Alex → one thread “Group (3)”; group chat with 3 people.
- [ ] **4. Three matches** — Accept Jordan → “Group (4)”; 4 people (max).
- [ ] **5. 4th accept blocked** — Accept Taylor → toast “Reached max ride limit. Group can have at most 4 people.”; Taylor remains pending; group stays 4.

---

## Resetting the flow

To run the flow again, re-run the seed (e.g. “Fill group chat test account” on login). That recreates test users and data with David’s ride at 0 accepted, 4 pending.
