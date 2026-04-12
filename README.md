# 🏆 Win Challenge Tracker

A free, real-time shared challenge tracker for you and your friends.
Built with plain HTML/CSS/JavaScript + Firebase Firestore.

---

## 📋 What You Get

| File | Purpose |
|---|---|
| `index.html` | **Viewer page** – read-only, share this link with friends |
| `admin.html` | **Admin page** – only you use this to check/uncheck tasks |
| `style.css` | All the visual styling |
| `app.js` | All the JavaScript logic |
| `firebase.js` | Firebase connection (you fill in your keys here) |

---

## 🚀 Setup Guide (Step-by-Step, Zero Coding Experience Required)

### STEP 1 – Create a Free Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Sign in with your Google account (Gmail)
3. Click **"Add project"** (or **"Create a project"**)
4. Type a project name, e.g. `win-challenge` → click **Continue**
5. Turn OFF Google Analytics (you don't need it) → click **Create project**
6. Wait ~10 seconds, then click **Continue**

---

### STEP 2 – Enable Firestore Database

1. In the left sidebar, click **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Select **"Start in test mode"** *(lets anyone read/write – fine for a friend group)*
4. Choose a location near you (e.g. `europe-west` or `us-east1`) → click **Enable**
5. Wait a moment while Firebase sets up

---

### STEP 3 – Get Your Firebase Config (API Keys)

1. Click the **gear icon ⚙️** near "Project Overview" in the left sidebar
2. Click **"Project settings"**
3. Scroll down to **"Your apps"**
4. If you see no apps yet, click the **`</>`** (Web) icon to register a web app
   - App nickname: `win-challenge-web` → click **Register app**
5. You will see a block of code that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};
```

6. **Copy everything INSIDE the curly braces** (the 6 lines with your actual values)

---

### STEP 4 – Paste Your Config Into the Project

1. Open the file **`firebase.js`** in any text editor
   - On Windows: right-click → "Open with" → Notepad
   - On Mac: right-click → "Open With" → TextEdit
2. Find this section near the top:

```javascript
const firebaseConfig = {
  apiKey:            "PASTE_YOUR_apiKey_HERE",
  authDomain:        "PASTE_YOUR_authDomain_HERE",
  projectId:         "PASTE_YOUR_projectId_HERE",
  storageBucket:     "PASTE_YOUR_storageBucket_HERE",
  messagingSenderId: "PASTE_YOUR_messagingSenderId_HERE",
  appId:             "PASTE_YOUR_appId_HERE"
};
```

3. Replace each `"PASTE_YOUR_..._HERE"` with your real values from Step 3
4. **Save the file** (Ctrl+S on Windows, Cmd+S on Mac)

Example of what it should look like after pasting:
```javascript
const firebaseConfig = {
  apiKey:            "AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  authDomain:        "win-challenge-abc.firebaseapp.com",
  projectId:         "win-challenge-abc",
  storageBucket:     "win-challenge-abc.appspot.com",
  messagingSenderId: "123456789012",
  appId:             "1:123456789012:web:abcdef1234567890"
};
```

---

### STEP 5 – Test Locally (Optional)

You can't just double-click the HTML files to test Firebase because browsers block
local file access to databases. Instead, use one of these:

**Option A – VS Code Live Server** (recommended)
1. Install [VS Code](https://code.visualstudio.com/)
2. Install the "Live Server" extension
3. Right-click `index.html` → "Open with Live Server"

**Option B – Python** (if installed)
```bash
cd win-challenge
python -m http.server 8000
```
Then open `http://localhost:8000`

---

### STEP 6 – Deploy to GitHub Pages (Free Hosting)

This makes your tracker accessible to all your friends on the internet for FREE.

**Part A – Create a GitHub account**
1. Go to [https://github.com](https://github.com) and sign up (free)

**Part B – Upload your files**
1. Click the **+** icon (top right) → **"New repository"**
2. Repository name: `win-challenge` (no spaces)
3. Make sure it's set to **Public**
4. Click **"Create repository"**
5. On the next page, click **"uploading an existing file"**
6. Drag and drop ALL your project files into the browser window:
   - `index.html`
   - `admin.html`
   - `style.css`
   - `app.js`
   - `firebase.js`
7. Scroll down, click **"Commit changes"**

**Part C – Enable GitHub Pages**
1. Click **"Settings"** tab in your repository
2. In the left sidebar, click **"Pages"**
3. Under "Branch", select **"main"** and click **Save**
4. Wait ~60 seconds, then refresh the page
5. You'll see a green banner with your URL, like:
   `https://YOUR-USERNAME.github.io/win-challenge/`

**Your two links will be:**
- 👥 **Viewer (share with friends):** `https://YOUR-USERNAME.github.io/win-challenge/`
- 🔑 **Admin (only for you):** `https://YOUR-USERNAME.github.io/win-challenge/admin.html`

---

### STEP 7 – Fix Firestore Security Rules (Important!)

By default, "test mode" expires after 30 days. To keep it working:

1. Go to Firebase Console → Firestore → **Rules** tab
2. Replace everything with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

3. Click **Publish**

> ⚠️ This is fine for a private friend group. If you want more security later,
> look into Firebase Authentication.

---

## ✏️ Customizing Your Tasks

Open `app.js` and find this section near the top:

```javascript
const DEFAULT_TASKS = [
  { id: "pushups",  label: "Pushups",      emoji: "💪", checked: false },
  { id: "study",    label: "Study 2h",     emoji: "📚", checked: false },
  // ... more tasks
];
```

- Change the `label` text to rename a task
- Change the `emoji` to any emoji you like
- Add a new line (copy a line, paste it, edit it) to add a task
- **Important:** each `id` must be unique (no spaces, no special characters)

After editing, re-upload `app.js` to GitHub.

> **Note:** If you've already used the tracker, changing DEFAULT_TASKS won't
> update Firestore. You'll need to go to Firebase Console → Firestore → find
> the `challenge/tasks` document and delete it so it resets.

---

## 🪟 Mini Mode

Click the **"Mini Mode"** button on any page to open a small 340×460 floating window.
Great for keeping on the side of your screen while you work!

---

## ❓ Troubleshooting

| Problem | Solution |
|---|---|
| Timer shows 00:00:00 and doesn't move | Check firebase.js has real API keys, not placeholders |
| Tasks don't load | Make sure Firestore is created in Firebase console |
| "Permission denied" error in browser console | Fix Firestore Rules (Step 7 above) |
| Admin can't check tasks | Make sure you're on `admin.html`, not `index.html` |
| Friends can't see your URL | Make sure GitHub Pages is enabled and repo is Public |

---

## 🎨 Changing the Tasks Color Theme

Open `style.css` and find the `:root` block near the top.
Change `--accent: #f0c040` to any color you like (e.g. `#60d0ff` for blue).

---

Made with ❤️ using Firebase + Vanilla JS
