# CASA 24 - DRIVER

A 3D driving game built with Three.js. Drive around a city with Pixar-style vehicles, explore on foot as an avatar, and play with a keyboard or PS5 controller.

---

## What You Need Before Starting

You need to install two things on your computer before you can run the game:

### 1. Install Node.js

Node.js is the engine that runs the game's development server.

1. Go to https://nodejs.org
2. Click the big green button that says **"LTS"** (this is the stable version)
3. Open the downloaded file and follow the installer steps (just keep clicking "Next" / "Continue")
4. When it's done, restart your terminal (or open a new one)

**To verify it worked**, open your terminal and type:

```
node --version
```

You should see a version number like `v20.x.x`. If you see an error, try restarting your computer and opening the terminal again.

> **How to open a terminal:**
> - **Mac**: Press `Cmd + Space`, type "Terminal", press Enter
> - **Windows**: Press `Win + R`, type "cmd", press Enter (or search "Command Prompt" in the Start menu)

### 2. Install Git

Git is a tool that lets you download the game's code.

1. Go to https://git-scm.com/downloads
2. Download the version for your operating system (Mac or Windows)
3. Open the downloaded file and follow the installer steps (the default options are fine, just keep clicking "Next")

**To verify it worked**, open your terminal and type:

```
git --version
```

You should see something like `git version 2.x.x`.

---

## Download the Game

Open your terminal and run these commands one at a time:

```bash
git clone https://github.com/your-username/DESDE-CERO-DR.git
```

> Replace `your-username` with the actual GitHub username where the game is hosted. If you received the game as a ZIP file instead, just unzip it and skip this step.

Now navigate into the game folder:

```bash
cd DESDE-CERO-DR
```

---

## Install the Game's Dependencies

The game uses external libraries (Three.js for 3D graphics, physics engines, etc.). You need to download them by running:

```bash
npm install
```

This will take a minute. You'll see a progress bar and then a summary. Don't worry about "warn" messages -- those are normal. If you see red "error" messages, try running the command again.

---

## Run the Game

Start the game by running:

```bash
npm run dev
```

You'll see something like:

```
VITE v6.x.x  ready in 150 ms

  -> Local:   http://localhost:5173/
```

**Open your web browser** (Chrome, Firefox, Edge, or Safari) and go to:

```
http://localhost:5173
```

The game menu should appear. Pick a vehicle and click **START GAME**.

---

## How to Play

### Keyboard Controls

| Action          | Keys                        |
|-----------------|-----------------------------|
| Accelerate      | `W` or `Arrow Up`           |
| Brake / Reverse | `S` or `Arrow Down`         |
| Turn Left       | `A` or `Arrow Left`         |
| Turn Right      | `D` or `Arrow Right`        |
| Handbrake       | `Space`                     |
| Avatar Camera   | `1` (cycles camera angles)  |
| Car Camera      | `2` (returns to car view)   |

### PS5 Controller (DualSense)

Connect your PS5 controller to your computer via USB cable or Bluetooth, then press any button so the browser detects it.

| Action          | Button / Stick              |
|-----------------|-----------------------------|
| Accelerate      | **R2 trigger** or Left Stick Up |
| Brake           | **L2 trigger** or **X button** |
| Steer           | **Left Stick** (analog) or D-Pad |
| Avatar Camera   | **Triangle**                |
| Car Camera      | **Options**                 |

> **Bluetooth pairing (PS5 controller):** Hold the **PS button** and **Share button** together until the light bar flashes. Then pair it in your computer's Bluetooth settings.

---

## Stop the Game

To stop the game server, go back to your terminal and press:

```
Ctrl + C
```

This shuts down the development server. You can restart it anytime with `npm run dev`.

---

## Troubleshooting

### "command not found: npm" or "command not found: node"
Node.js is not installed or your terminal can't find it. Reinstall Node.js from https://nodejs.org and restart your terminal.

### "command not found: git"
Git is not installed. Reinstall it from https://git-scm.com/downloads and restart your terminal.

### The page is blank or shows errors
1. Open the browser's developer console (`F12` or `Cmd + Option + I` on Mac) and check for red error messages
2. Make sure you ran `npm install` before `npm run dev`
3. Try stopping the server (`Ctrl + C`) and running `npm run dev` again

### PS5 controller not working
- Make sure the controller is connected (USB or Bluetooth) **before** you open the game
- Press any button on the controller after the page loads so the browser can detect it
- Chrome has the best gamepad support. If it doesn't work in Safari, try Chrome

### The game runs slowly
- Close other browser tabs to free up memory
- Make sure you're not running on battery power (plug in your laptop)
- Try a different browser (Chrome usually has the best WebGL performance)
