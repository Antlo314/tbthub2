# Sacred Sanctum - Local Build Instructions

## 🚀 How to Run
1.  **Open `index.html`**: Simply double-click the file to open it in your browser (Chrome/Edge recommended).
2.  **Internet Connection**: Required *initially* to load the "Engine" (Tailwind CSS, Supabase, GSAP, Howler).
3.  **Login**:
    *   **Admin Access**: Sign in with `admin@truthbtoldhub.com` to see the **Architect's Console** (Admin Panel) at the bottom of the dashboard.
    *   **Demo Mode**: If Supabase is unreachable, the app effectively runs in a local "Demo Mode".

## 🛠️ Setup Requirements (Supabase)
To fully enable the **Tier System** and **Live Pulse**, you must run the provided SQL in your Supabase SQL Editor.

### Quick SQL Checklist
1.  Go to Supabase > SQL Editor.
2.  Paste the code from `implementation_plan.md` (or the `supabase-setup.sql` file).
3.  Click "Run".

## 📱 Mobile Features
*   **Bottom Navigation**: Appears automatically on screens smaller than 768px.
*   **Haptics**: Vibration feedback on voting (supported on most Android phones, some iOS config required).
*   **Touch Optimizations**: Larger tap targets for "Vote" and "Nav" buttons.

## 🎵 Sound
*   **No Music**: As requested, the experience is silent except for premium UI sound effects (clicks, wooshes) powered by Howler.js.
