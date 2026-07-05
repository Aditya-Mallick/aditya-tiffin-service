# Phase 0 — Setup guide

This gets the login working end-to-end. Do it once. It's free and needs no credit card.
Everything in code is already built; you just create the free Supabase project and paste in two keys.

Steps 1–4 are required. Step 6 (add-user function) is optional and can wait.

---

## 1. Create a free Supabase project

1. Go to **https://supabase.com** → **Start your project** → sign in with Google or email.
2. Click **New project**.
   - **Name:** `aditya-tiffin`
   - **Database password:** pick a strong one and save it somewhere safe (you rarely need it).
   - **Region:** choose the closest — **South Asia (Mumbai)**.
   - **Plan:** Free.
3. Wait ~2 minutes for it to finish setting up.

## 2. Create the tables and security rules

1. In the left sidebar open **SQL Editor** → **New query**.
2. Open the file `supabase/migrations/0001_init.sql` from this project, copy **all** of it, paste into the editor.
3. Click **Run**. You should see "Success". This creates every table, all the privacy rules, and seeds your menu (Veg ₹70, Egg ₹90, Chicken ₹130, Fish ₹130, Mutton ₹180, the two special thalis, and Roti).

## 3. Connect the app to Supabase

1. In Supabase, go to **Project Settings → API**. Copy two values:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (a long string). *This one is safe to put in the app — the security rules protect your data regardless.*
2. In this project, copy `.env.example` to a new file called **`.env.local`** and fill them in:
   ```
   VITE_SUPABASE_URL=https://abcd1234.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key...
   ```
3. Turn **off** email confirmation (we log in by mobile+PIN, not email): **Authentication → Sign In / Providers → Email** → turn **Confirm email** OFF → Save.

## 4. Create your Owner login (mobile 8800811493)

1. In Supabase: **Authentication → Users → Add user → Create new user**.
   - **Email:** `8800811493@tiffin.local`
   - **Password:** the PIN you want (e.g. a 4–6 digit number). Remember it.
   - Tick **Auto Confirm User** if shown.
   - Create.
2. Now mark that user as the **Owner**. Open **SQL Editor** and run:
   ```sql
   insert into public.profiles (id, full_name, mobile, role, active)
   select id, 'Aditya', '8800811493', 'owner', true
   from auth.users where email = '8800811493@tiffin.local'
   on conflict (id) do update set role = 'owner', full_name = 'Aditya';
   ```

## 5. Run the app and log in

```bash
npm install
npm run dev
```

Open the printed URL and go to **`/manage`** (e.g. `http://localhost:5173/manage`).
Sign in with mobile **8800811493** and your PIN. You should land on the dashboard, showing your name and the "Owner" badge, with Payments/Bills cards visible (those are hidden for staff).

The public site is unchanged at `/`.

---

## 6. (Optional) Add mother & staff from inside the app

Creating other logins securely needs the **secret** key, so it runs on Supabase's servers as an Edge Function (already written at `supabase/functions/admin-users/index.ts`). This is free.

**One-time install (needs the Supabase CLI):**
```bash
npm install -g supabase          # or: brew install supabase/tap/supabase
supabase login
supabase link --project-ref YOUR-PROJECT-REF   # the ref is in your project URL
supabase functions deploy admin-users
supabase secrets set LOGIN_EMAIL_DOMAIN=tiffin.local
```
(`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided to the function automatically.)

Until this is deployed, you can still add your mother and staff manually the same way you made the Owner in step 4 — just use `role` = `admin` (mother) or `staff` (delivery person) in the SQL. Once the function is deployed, I'll wire an **"Add user"** screen into the app so you can do it with a tap and test the whole flow yourself.

---

## What you'll have after Phase 0

- Public landing page at `/` (unchanged).
- A working login at `/manage` using **mobile + PIN**, no SMS, no cost.
- The full database with privacy rules live: staff can't read money tables or edit past dates; only the Owner can permanently erase.
- Your menu and prices seeded.

## Free-tier reminder

The free Supabase project pauses only after **7 days of zero activity** — daily use avoids that entirely. If you're ever away for a week, the first visit just takes ~30 seconds to wake up. No charges, ever, on the free plan.

## Next (Phase 1 & 2)

Customers screen, then the daily-lists screen (the one your mother and delivery person use every day) — with copy-from-yesterday, the today-only lock for staff, Trash/restore, and Hindi confirmations.
