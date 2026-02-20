# Edge case testing checklist

Use this after re-seeding (Create test accounts on login) and with migration `019_ride_groups_insert_policy.sql` applied.

---

## 1. 1:1 → Group chat

- [ ] **Accept second request**  
  Log in as **david@knot-test.dev** → Messages: see 1:1 with Sophia (SFO). Home → accept Alex’s request → redirect to Messages; list shows **Group (3)** (no separate 1:1s). Open group: same messages as before.

- [ ] **List refresh**  
  After accepting, URL is `/messages?refresh=1` then becomes `/messages`. List is fresh (group visible).

- [ ] **Already a group**  
  Log in as **chris@knot-test.dev** (or jordan/taylor/riley). Messages: only **Group (4)** for BUR; no separate 1:1s.

- [ ] **Stale 1:1 URL**  
  As David, open 1:1 with Sophia. In another tab/device, accept Alex. Back on first tab: refresh or go to Messages → open the SFO thread. You should land on **Group (3)** (redirect from old 1:1 URL).

---

## 2. Group chat

- [ ] **View members**  
  In any group, tap “View members” → list of participants with avatars; tap one → profile page.

- [ ] **Sender name/avatar**  
  Each message from others shows correct name and avatar; your messages stay right-aligned without your name.

- [ ] **Empty group**  
  (Requires custom seed or accepting 2nd request without prior messages.) New group opens with empty state / “Start the conversation”.

- [ ] **Realtime**  
  Two browsers: same group, send from one → message appears in the other without refresh.

- [ ] **Group ride status**  
  In a group, status bar shows Accepted → Confirmed → Completed. Any participant can tap “Confirm meetup” or “Complete ride”; status updates for the whole group.

- [ ] **Leave group**  
  Menu (⋯) → “Leave group”. Requester: your request is cancelled, you’re redirected to Messages, thread disappears. Host: all requests are cancelled, group disappears for everyone.

---

## 3. Match cap (4 per ride)

- [ ] **Fourth accept**  
  Ride with 3 accepted; accept fourth → succeeds; group shows 5 people.

- [ ] **Fifth accept blocked**  
  Ride with 4 accepted; try to accept a fifth → toast: “This ride already has 4 matches. You can't add more.” (or similar). Request stays pending.

---

## 4. Ride requests (Home)

- [ ] **Accept**  
  Incoming request → Accept → success toast, redirect to Messages?refresh=1, request gone from Home.

- [ ] **Reject**  
  Incoming request → Reject → request disappears, no new chat.

- [ ] **Withdraw**  
  Outgoing pending → Withdraw → request removed; error toast shows real message if it fails.

---

## 5. Messages & chat

- [ ] **1:1 only**  
  **sarah@knot-test.dev** → Messages: 1:1 with Mike (LAX). Send/receive works.

- [ ] **Empty thread**  
  New 1:1 or new group with no messages → empty state; first message sends and appears.

- [ ] **Blocked user (1:1)**  
  In 1:1, block the other user (menu → Block). Banner: “You have blocked this user…”. Input and send disabled; unblock from menu → can send again.

- [ ] **Cancelled ride**  
  In 1:1, Leave ride / Cancel → status “Ride cancelled”. Thread disappears from Messages list (cancelled filtered out).

- [ ] **Completed ride**  
  In 1:1, Confirm meetup → Complete ride. Thread disappears from active Messages list (completed filtered out).

---

## 6. Ride status (1:1)

- [ ] **Confirm meetup**  
  Status “Accepted” → “Confirm meetup” → “Confirmed”.

- [ ] **Complete ride**  
  Status “Confirmed” → “Complete ride” → “Completed”; thread leaves active list.

- [ ] **Cancel**  
  “Leave ride” → status “Ride cancelled”; thread leaves active list.

- [ ] **Group**  
  In group chat, no per-request status steps (no “Confirm meetup” / “Complete ride” for the group thread).

---

## 7. Not found & invalid

- [ ] **Invalid conversation id**  
  Open `/messages/00000000-0000-0000-0000-000000000001` (or other non-existent id). “Conversation not found” with “Back to Messages”.

- [ ] **Invalid group id**  
  Open `/messages/00000000-0000-0000-0000-000000000001?group=1`. Same not-found state.

---

## 8. Empty / boundary

- [ ] **No conversations**  
  New user or user with no matches → “No active conversations” and “Find matches”.

- [ ] **Search**  
  With several threads, search by name or route → correct threads only.

---

## 9. Errors

- [ ] **Session expired**  
  (Simulate: clear auth or use expired token.) Send message or accept request → “Your session expired” (or similar) and redirect to login.

- [ ] **Cap exceeded message**  
  When fifth accept is blocked, toast is friendly: “This ride already has 4 matches…”, not raw DB message.

---

## 10. Seed

- [ ] **Re-seed**  
  Run “Create test accounts” again → no duplicate key errors; David has 1:1 + pending; Chris has group.

- [ ] **David 1:1 → accept Alex**  
  David: Messages (1:1 with Sophia) → Home → accept Alex → Messages shows Group (3) with migrated messages.
