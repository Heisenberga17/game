# CASA 24 - DRIVER

A 3D driving game built with Three.js. Drive around a city with Pixar-style vehicles (Lightning McQueen, Guido, and more), walk around as a custom character, and play with a keyboard or PS5 controller.

---

## Before You Start

You will need:
- A Windows computer (Windows 10 or 11)
- An internet connection
- About 15 minutes of time

You will install two free programs (**Node.js** and **Git**), then download and run the game. Every single step is explained below — just follow them in order.

---

## STEP 1: Open the Command Prompt

The Command Prompt is a text window where you type commands to set up and run the game. Think of it like texting your computer instructions.

1. Click the **Start** button (the Windows logo at the bottom-left of your screen)
2. Type **cmd**
3. You will see **"Command Prompt"** appear in the search results
4. **Right-click** on it and select **"Run as administrator"**
5. If a popup asks **"Do you want to allow this app to make changes to your device?"**, click **Yes**
6. A black window with white text appears — this is your Command Prompt

> **Keep this window open for the entire process.** Every command below gets typed into this window. After typing each command, press the **Enter** key on your keyboard to run it.

---

## STEP 2: Install Node.js

Node.js is the engine that runs the game on your computer. Without it, the game cannot start.

### Download Node.js

1. Open your web browser (Chrome, Edge, or Firefox)
2. Go to this website: **https://nodejs.org**
3. You will see two big buttons. Click the one that says **"LTS"** (it will have a number like "20.x.x" — the exact number doesn't matter)
4. A file will start downloading (about 30 MB). Wait for it to finish
5. Look at the bottom of your browser or your Downloads folder — you will see a file named something like `node-v20.11.0-x64.msi`

### Install Node.js

1. **Double-click** the downloaded `.msi` file
2. An installer window opens. Here's what to do on each screen:
   - **Welcome screen**: Click **Next**
   - **License Agreement**: Check the box that says **"I accept the terms in the License Agreement"**, then click **Next**
   - **Destination Folder**: Don't change anything. Click **Next**
   - **Custom Setup**: Don't change anything. Click **Next**
   - **Tools for Native Modules**: Don't change anything. Click **Next**
   - **Ready to install**: Click **Install**
   - If Windows asks for permission, click **Yes**
   - **Completed**: Click **Finish**

### Verify Node.js is installed

**IMPORTANT: Close your Command Prompt and open a new one** (repeat Step 1). This is needed so the Command Prompt knows Node.js exists.

Now type this command and press **Enter**:

```
node --version
```

You should see something like:

```
v20.11.0
```

Now type this and press **Enter**:

```
npm --version
```

You should see something like:

```
10.2.4
```

> If either command says **"is not recognized as an internal or external command"**, restart your computer, open a new Command Prompt, and try again.

---

## STEP 3: Install Git

Git is the tool that downloads the game's code from the internet (like a specialized downloader for code projects).

### Download Git

1. Open your web browser
2. Go to this website: **https://git-scm.com/downloads/win**
3. The download should start automatically. If it doesn't, click **"Click here to download manually"**
4. Wait for the file to download (about 55 MB). It will be named something like `Git-2.43.0-64-bit.exe`

### Install Git

1. **Double-click** the downloaded `.exe` file
2. If Windows asks for permission, click **Yes**
3. The installer has **many screens**. Here's the easy approach: **just keep clicking "Next" on every screen without changing anything**. Don't worry about the options — the defaults are fine
4. On the final screen, click **Install**
5. When it finishes, click **Finish**

### Verify Git is installed

**Close your Command Prompt and open a new one** (repeat Step 1).

Type this and press **Enter**:

```
git --version
```

You should see something like:

```
git version 2.43.0.windows.1
```

> If it says **"is not recognized"**, restart your computer, open a new Command Prompt, and try again.

---

## STEP 4: Download the Game

Now you will download the game's code to your computer.

### Choose where to put the game

First, let's navigate to your Desktop so the game folder ends up somewhere easy to find. Type this and press **Enter**:

```
cd %USERPROFILE%\Desktop
```

### Download the game

Now type this exact command and press **Enter**:

```
git clone https://github.com/Heisenberga17/game.git
```

You will see text scrolling like:

```
Cloning into 'game'...
remote: Enumerating objects: 250, done.
remote: Counting objects: 100% (250/250), done.
Receiving objects: 100% (250/250), 15.00 MiB | 5.00 MiB/s, done.
```

Wait until it finishes and you see the blinking cursor again. A new folder called **"game"** now exists on your Desktop.

### Enter the game folder

Type this and press **Enter**:

```
cd game
```

Your Command Prompt should now show something like:

```
C:\Users\YourName\Desktop\game>
```

---

## STEP 5: Install the Game's Dependencies

The game uses external libraries (a 3D graphics engine, a physics engine, etc.). This command downloads them all automatically.

Type this and press **Enter**:

```
npm install
```

This will take **30 seconds to 2 minutes**. You will see a progress bar and lots of text. Wait until it finishes and says something like:

```
added 45 packages in 12s
```

> **Don't worry** about yellow "WARN" messages — those are completely normal. Only red "ERR!" messages are problems (and they're rare).

---

## STEP 6: Run the Game

Type this and press **Enter**:

```
npm run dev
```

You will see:

```
  VITE v6.4.1  ready in 150 ms

  -> Local:   http://localhost:5173/
  -> Network: use --host to expose
```

The game server is now running on your computer!

### Open the Game in Your Browser

1. Open **Google Chrome** (recommended for best performance — if you don't have it, any browser works)
2. Click on the **address bar** at the top of the browser (where it says the current website address)
3. Type this exact address:

```
http://localhost:5173
```

4. Press **Enter**
5. The game menu appears with the title **CASA 24 - DRIVER**

### Start Playing

1. **Select a character** — click on one of the three characters (Bo.Wlie, Pyro, or Zacko)
2. **Select a vehicle** — scroll through the vehicle list and click on one (Lightning McQueen is selected by default)
3. Click the **START GAME** button
4. You're in the game!

> **IMPORTANT**: Keep the Command Prompt window open while you play. If you close it, the game stops. Just leave it in the background (you can minimize it).

---

## How to Play

### Keyboard Controls — Driving

| Action | Keys |
|---|---|
| **Go forward** | `W` or `Up Arrow` |
| **Go backward** | `S` or `Down Arrow` |
| **Turn left** | `A` or `Left Arrow` |
| **Turn right** | `D` or `Right Arrow` |
| **Handbrake (stop fast)** | `Space bar` |

### Keyboard Controls — Walking as Your Character

| Action | Keys |
|---|---|
| **Switch to avatar (walk around)** | Press `1` (above Q, not the numpad) |
| **Switch camera view** | Press `1` again to toggle between behind and front views |
| **Go back to car** | Press `2` |
| **Walk forward** | `W` or `Up Arrow` |
| **Walk backward** | `S` or `Down Arrow` |
| **Walk left** | `A` or `Left Arrow` |
| **Walk right** | `D` or `Right Arrow` |

### PS5 Controller (DualSense)

You can play with a PlayStation 5 controller.

#### How to Connect via USB Cable

1. Plug a **USB-C cable** into the top of the PS5 controller
2. Plug the other end into your computer
3. The controller light bar will turn on
4. Click anywhere on the game in your browser
5. Press any button on the controller — it will start working

#### How to Connect via Bluetooth

1. Make sure the PS5 controller is **off** (light bar not lit)
2. Hold down the **PS button** (center PlayStation logo) and the **Share button** (small button left of the touchpad) **at the same time** for 3 seconds
3. The light bar will start **flashing blue rapidly** — it's in pairing mode
4. On your computer: go to **Settings > Bluetooth & devices > Add device > Bluetooth**
5. Find **"Wireless Controller"** in the list and click it
6. The light bar will turn solid — it's connected
7. Go to the game in your browser and press any button

#### Controller Buttons

| Action | Button |
|---|---|
| **Accelerate** | **R2** (right trigger — press harder for more speed) |
| **Brake** | **L2** (left trigger) or **X button** |
| **Steer** | **Left Stick** (tilt left or right) |
| **Forward / Backward** | **Left Stick** up/down or **D-Pad** up/down |
| **Walk as avatar** | **Triangle** |
| **Back to car** | **Options** (small button right of the touchpad) |

---

## Available Vehicles

| Vehicle | Description |
|---|---|
| Lightning McQueen | Red race car from Pixar's Cars |
| Cal Weathers | Blue race car from Cars 3 |
| Guido | Small blue forklift from Cars |
| Taxi | Classic yellow taxi |
| Police | Police cruiser with lights |
| Fire Truck | Red fire truck |
| Race Car | Generic race car |
| Truck | Large cargo truck |

## Available Characters

| Character | Description |
|---|---|
| Bo.Wlie | Smooth lines, clean style |
| Pyro | Burns the park down |
| Zacko | Raw street energy |

---

## How to Stop the Game

1. Go back to your Command Prompt window
2. Press **Ctrl + C** (hold the **Ctrl** key and press **C** at the same time)
3. If it asks **"Terminate batch job (Y/N)?"**, type **Y** and press **Enter**
4. The server stops

---

## How to Play Again Later

Every time you want to play again after closing everything:

1. Open the **Command Prompt** (Start > type **cmd** > press Enter)
2. Navigate to the game folder:

```
cd %USERPROFILE%\Desktop\game
```

3. Start the game:

```
npm run dev
```

4. Open your browser and go to **http://localhost:5173**

That's it — just those 3 steps from now on.

---

## How to Update the Game

If the game has been updated online and you want the latest version:

1. Open the Command Prompt
2. Navigate to the game folder:

```
cd %USERPROFILE%\Desktop\game
```

3. Download updates:

```
git pull
```

4. Install any new dependencies:

```
npm install
```

5. Run the game:

```
npm run dev
```

---

## Troubleshooting

### "node is not recognized as an internal or external command"

Node.js is not installed correctly.

1. Go back to **STEP 2** and reinstall Node.js
2. **Close your Command Prompt completely** and open a brand new one
3. Try `node --version` again
4. If it still doesn't work, **restart your computer** and try again

### "git is not recognized as an internal or external command"

Git is not installed correctly.

1. Go back to **STEP 3** and reinstall Git
2. **Close your Command Prompt completely** and open a brand new one
3. Try `git --version` again
4. If it still doesn't work, **restart your computer** and try again

### "npm ERR!" when running npm install

1. Make sure you are inside the game folder (your Command Prompt should show `...\game>`)
2. Try running it again: `npm install`
3. If it keeps failing, delete the downloaded packages and try again:

```
rmdir /s /q node_modules
npm install
```

### The page at localhost:5173 doesn't load / says "can't reach this page"

1. Make sure the Command Prompt still shows the server running (the "VITE ready" message). If you closed it, run `npm run dev` again
2. Make sure you typed the address correctly: **http://localhost:5173** (not http**s**, not .com)
3. Try a different browser
4. Check if the terminal shows a different port (like 5174) — use that number instead

### The game loads but the screen is black

1. Press **F12** on your keyboard to open the browser's developer tools
2. Click the **"Console"** tab at the top
3. Look for red error messages — they will tell you what went wrong
4. Most common fix: stop the server (Ctrl + C), run `npm install` again, then `npm run dev`

### PS5 controller is connected but the game doesn't respond

1. Make sure you are using **Google Chrome** (best gamepad support)
2. Click anywhere on the game page first (the browser needs to be focused)
3. Press any button on the controller — the browser needs at least one input to detect it
4. Try unplugging and replugging the controller
5. Open a new tab and type `chrome://gamepad` in the address bar — this page shows if Chrome can see your controller

### The game is laggy / slow

1. **Close other browser tabs** — each tab uses memory
2. **Plug in your laptop** — battery mode reduces graphics performance
3. **Use Chrome** — it has the best 3D performance
4. **Close other programs** — especially other games or video editors

### Port 5173 is already in use

If you see "Port 5173 is in use, trying another one...", the game picks a different port automatically (like 5174). Just use whatever address the Command Prompt shows after "Local:".

### I want to start completely fresh

If something went really wrong and you want to start over from scratch:

1. Delete the **game** folder from your Desktop
2. Go back to **STEP 4** and follow all steps again

---

## Tech Stack (For Developers)

- **Three.js** — 3D graphics engine
- **Cannon-es** — Physics engine
- **Vite** — Development server and build tool
- **TypeScript** — Programming language
- **lil-gui** — Debug controls panel (the sliders on the right side of the screen)
- **stats.js** — FPS counter (top-left corner)
