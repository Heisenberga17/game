# CASA 24 - DRIVER

A 3D driving game built with Three.js. Drive around a city with Pixar-style vehicles (Lightning McQueen, Guido, and more), explore on foot as an avatar, and play with a keyboard or PS5 controller.

---

## STEP 1: Open Your Terminal

The terminal is where you will type all the commands to set up and run the game. You only need to open it once.

### On Mac

1. Press **Cmd + Space** on your keyboard (this opens Spotlight Search)
2. A search bar appears in the center of your screen
3. Type the word **Terminal**
4. Press **Enter**
5. A black/white window with text appears — that's your terminal

### On Windows

1. Click the **Start** button (bottom left corner of your screen, the Windows logo)
2. Type **cmd**
3. You'll see **"Command Prompt"** appear in the results
4. Click on it
5. A black window with white text appears — that's your terminal

> Keep this window open for the entire process. Every command below gets typed into this window and you press **Enter** after each one.

---

## STEP 2: Install Node.js

Node.js is the program that runs the game on your computer. Without it, nothing works.

1. Open your web browser (Chrome, Safari, Edge, Firefox — any works)
2. Go to this address: **https://nodejs.org**
3. You'll see a big green button that says **"LTS"** with a version number (something like 20.x.x). Click that button
4. A file will download (around 30 MB). Wait for it to finish
5. Open the downloaded file:
   - **Mac**: It's a `.pkg` file. Double-click it
   - **Windows**: It's a `.msi` file. Double-click it
6. An installer window opens. Follow these steps:
   - Click **"Continue"** (Mac) or **"Next"** (Windows)
   - Click **"Continue"** / **"Next"** again
   - Click **"Agree"** if it asks you to accept the license
   - Click **"Install"**
   - If it asks for your password, type your computer's password and click **"OK"**
   - Click **"Close"** when it says the installation is complete

### Verify Node.js is installed

Go back to your terminal and type this command, then press **Enter**:

```
node --version
```

You should see something like:

```
v20.11.0
```

The exact number doesn't matter as long as you see a version number. If you see **"command not found"**, close the terminal, open a new one, and try again. If it still doesn't work, restart your computer and try once more.

Now verify npm (it comes bundled with Node.js). Type this and press **Enter**:

```
npm --version
```

You should see something like:

```
10.2.4
```

If both commands showed version numbers, you're good. Move to the next step.

---

## STEP 3: Install Git

Git is the tool that downloads the game's source code from the internet.

1. Open your browser and go to: **https://git-scm.com/downloads**
2. Click on your operating system:
   - **Mac**: Click **"macOS"**
   - **Windows**: Click **"Windows"**
3. Download the installer and open it
4. Follow the installer:
   - **On Mac**: If it says the app "can't be opened because it's from an unidentified developer", go to **System Preferences > Security & Privacy** and click **"Open Anyway"**
   - **On Windows**: Just keep clicking **"Next"** for every screen. Don't change any options. Click **"Install"** at the end, then **"Finish"**

### Verify Git is installed

Go back to your terminal (or open a new one) and type:

```
git --version
```

You should see something like:

```
git version 2.43.0
```

If you see a version number, you're good. Move on.

---

## STEP 4: Download the Game

Now you'll download the game's code. In your terminal, type this exact command and press **Enter**:

```bash
git clone https://github.com/Heisenberga17/game.git
```

You'll see something like:

```
Cloning into 'game'...
remote: Enumerating objects: 250, done.
remote: Counting objects: 100% (250/250), done.
Receiving objects: 100% (250/250), 15.00 MiB | 5.00 MiB/s, done.
```

Wait for it to finish. Now navigate into the game folder by typing:

```bash
cd game
```

> **What just happened?** You downloaded a copy of the entire game to your computer. The `cd` command moves your terminal "inside" the game folder so the next commands run in the right place.

---

## STEP 5: Install the Game's Dependencies

The game uses external libraries (3D graphics engine, physics engine, etc.). You need to download them. Type this and press **Enter**:

```bash
npm install
```

This will take 30 seconds to 2 minutes. You'll see a progress bar and lots of text scrolling. Wait until you see something like:

```
added 45 packages in 12s
```

> **Don't worry** about yellow "WARN" messages — those are normal and harmless. Only red "ERR!" messages are a problem (and they're rare).

---

## STEP 6: Run the Game

Type this command and press **Enter**:

```bash
npm run dev
```

You'll see:

```
  VITE v6.4.1  ready in 150 ms

  -> Local:   http://localhost:5173/
  -> Network: use --host to expose
```

The game server is now running.

### Open the Game in Your Browser

1. Open your web browser (Chrome recommended for best performance)
2. Click on the address bar at the top (where it says "google.com" or similar)
3. Type this exact address and press **Enter**:

```
http://localhost:5173
```

4. The game menu appears with the title **CASA 24 - DRIVER**
5. Click on any vehicle to select it (Lightning McQueen is selected by default)
6. Click the **START GAME** button

You're playing!

> **Important**: Keep the terminal window open while you play. If you close it, the game stops. Just leave it in the background.

---

## How to Play

### Keyboard Controls

| Action | Keys |
|---|---|
| **Accelerate (go forward)** | `W` or `Arrow Up` |
| **Reverse (go backward)** | `S` or `Arrow Down` |
| **Turn Left** | `A` or `Arrow Left` |
| **Turn Right** | `D` or `Arrow Right` |
| **Handbrake (stop fast)** | `Space bar` |
| **Walk around as avatar** | Press `1` on your keyboard (above Q, not numpad) |
| **Go back to car** | Press `2` on your keyboard |

> **Tip:** When in avatar mode, press `1` again to switch between behind-the-character and front-facing camera views.

### PS5 Controller (DualSense)

You can play with a PS5 controller. Here's how to connect it:

#### Connect via USB Cable

1. Plug a USB-C cable into the top of the PS5 controller
2. Plug the other end into your computer
3. The controller light bar will turn on
4. Go to the game in your browser and press any button on the controller
5. Done — it should work immediately

#### Connect via Bluetooth

1. Make sure the PS5 controller is **off** (light bar not lit)
2. Hold down the **PS button** (center button with the PlayStation logo) and the **Share button** (small button to the left of the touchpad) **at the same time** for 3 seconds
3. The light bar will start **flashing blue rapidly** — this means it's in pairing mode
4. On your computer:
   - **Mac**: Go to **System Settings > Bluetooth**, find "DualSense Wireless Controller" and click **"Connect"**
   - **Windows**: Go to **Settings > Bluetooth & devices > Add device > Bluetooth**, find "Wireless Controller" and click it
5. The light bar will turn solid — it's connected
6. Go to the game in your browser and press any button on the controller

#### Controller Button Map

| Action | Button |
|---|---|
| **Accelerate** | **R2** (right trigger, press hard for more speed) |
| **Brake** | **L2** (left trigger) or **X button** (bottom face button) |
| **Steer** | **Left Stick** (tilt left/right — it's analog so small tilts = gentle turns) |
| **Steer (digital)** | **D-Pad** left/right |
| **Forward/Backward** | **Left Stick** up/down or **D-Pad** up/down |
| **Walk as avatar** | **Triangle** (top face button) |
| **Back to car** | **Options** (small button to the right of the touchpad) |

---

## Available Vehicles

| Vehicle | Description |
|---|---|
| Lightning McQueen | Red race car from Cars |
| Cal Weathers | Race car from Cars 3 |
| Guido | Small blue forklift from Cars |
| Taxi | Classic yellow taxi |
| Police | Police cruiser |
| Fire Truck | Red fire truck |
| Race Car | Generic race car |
| Truck | Large truck |

---

## How to Stop the Game

1. Go back to your terminal (the black/white window from earlier)
2. Press **Ctrl + C** (hold the Ctrl key and press C)
3. The server stops and you'll see your normal terminal prompt again

To play again later, just do:

```bash
cd game
npm run dev
```

Then open **http://localhost:5173** in your browser again.

---

## How to Update the Game

If the game has been updated on GitHub, you can get the latest version:

1. Open your terminal
2. Navigate to the game folder:

```bash
cd game
```

3. Download the updates:

```bash
git pull
```

4. Install any new dependencies:

```bash
npm install
```

5. Run the game:

```bash
npm run dev
```

---

## Troubleshooting

### "command not found: node" or "command not found: npm"

Node.js is not installed correctly.

1. Go back to **STEP 2** and reinstall Node.js
2. After installing, **close your terminal completely** and open a new one
3. Try `node --version` again
4. If it still doesn't work, **restart your computer** and try again

### "command not found: git"

Git is not installed correctly.

1. Go back to **STEP 3** and reinstall Git
2. After installing, **close your terminal completely** and open a new one
3. Try `git --version` again

### "npm ERR!" when running npm install

1. Make sure you're inside the game folder (you ran `cd game`)
2. Try running it again: `npm install`
3. If it keeps failing, delete the `node_modules` folder and try again:
   - **Mac**: `rm -rf node_modules && npm install`
   - **Windows**: `rmdir /s /q node_modules` then `npm install`

### The page at localhost:5173 doesn't load / says "can't reach this page"

1. Make sure the terminal still shows the server running (the "VITE ready" message). If you accidentally closed it, run `npm run dev` again
2. Make sure you typed the address correctly: **http://localhost:5173** (not https, not .com)
3. Try a different browser

### The game loads but the screen is black

1. Press **F12** on your keyboard to open the browser's developer tools
2. Click the **"Console"** tab
3. Look for red error messages — they'll tell you what went wrong
4. Most common fix: stop the server (Ctrl + C), run `npm install` again, then `npm run dev`

### PS5 controller is connected but the game doesn't respond

1. Make sure you're using **Google Chrome** (best gamepad support)
2. Click anywhere on the game page first (the browser needs focus)
3. Press any button on the controller — the browser needs at least one input to detect it
4. Try unplugging and replugging the controller
5. Try going to **chrome://gamepad** in Chrome's address bar to verify the browser sees the controller

### The game is laggy / slow framerate

1. **Close other browser tabs** — each tab uses memory and GPU
2. **Plug in your laptop** — battery mode reduces GPU performance
3. **Use Chrome** — it generally has the best WebGL/3D performance
4. **Close other programs** — especially other games or video editors
5. **Disable browser extensions** — some extensions (like ad blockers) can slow down WebGL

### Port 5173 is already in use

If you see a message like "Port 5173 is in use, trying another one...", the game will automatically pick a different port (like 5174). Just use whatever address the terminal shows you after "Local:".
