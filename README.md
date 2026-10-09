# Rock, Paper, Scissors, Shoot!

A browser-based webcam game created for the children at Haven Benoni Welfare.

The player competes against Charlie in a configurable three- or five-round
match. The game detects the player's hand gesture through the webcam,
animates Charlie's hand, announces the result with speech, and displays
the final score.

## Features

- Webcam hand-gesture detection using MediaPipe Tasks Vision
- Rock, Paper, and Scissors recognition
- Configurable three- or five-round match
- Spoken and visual countdown: `Rock`, `Paper`, `Scissors`, `Shoot!`
- Animated Charlie hand
- Player and Charlie scores
- Round-by-round result display
- Friendly spoken feedback
- Best-effort South African English voice selection
- Play again and reset score controls
- Voice on/off control
- Stable gesture confirmation to reduce false readings
- Manual Rock, Paper, or Scissors fallback buttons
- Camera privacy notice
- Responsive layout for desktop and smaller screens
- Round progress indicators, fullscreen mode, and a dedicated camera stop button
- High-contrast accessibility mode and local score history
- Charlie reaction effects and confetti for a player match win
- Service-worker caching for the app and MediaPipe resources after the first
  online load

## Requirements

- Windows, macOS, or Linux
- Google Chrome or Microsoft Edge
- Python 3 installed
- A working webcam
- Internet access the first time the game loads

The browser version loads MediaPipe and its model from official online
resources. It does not upload or record the camera video.

## Project structure

| File | Purpose |
| --- | --- |
| `index.html` | Main game page and user interface |
| `styles.css` | Colors, layout, animations, and responsive styling |
| `app.js` | Game logic, webcam access, gesture detection, scoring, and speech |
| `hand_tracking.py` | Shared MediaPipe Tasks helper for the Python utilities |
| `hand_test.py` | Python webcam hand-detection test |
| `test_camera.py` | Python-only camera test |
| `record_letter.py` | Older Python sample-recording utility |
| `hand_landmarker.task` | Local MediaPipe model used by the Python utilities |
| `letters/` | Folder created by `record_letter.py` for saved samples |

## Run the browser game

### 1. Open PowerShell

Change to the project folder:

```powershell
cd "C:\Users\User\Desktop\CVTS\Hand_tested"
```

### 2. Start a local web server

```powershell
py -m http.server 8000
```

Keep this PowerShell window open while playing.

### 3. Open the game

Open Chrome or Edge and visit:

```text
http://localhost:8000
```

Do not open `index.html` by double-clicking it. The local server is needed for
browser module loading and reliable camera permissions.

### 4. Allow camera access

When the browser asks for camera access, select **Allow**.

If the permission was previously blocked:

1. Open `http://localhost:8000`.
2. Click the camera or site-settings icon beside the address bar.
3. Set **Camera** to **Allow**.
4. Refresh with `Ctrl + Shift + R`.

You can also manage permissions at:

```text
chrome://settings/content/camera
```

If Windows blocks the camera, open **Settings > Privacy & security > Camera**
and enable:

- Camera access
- Let apps access your camera
- Let desktop apps access your camera

## How to play

1. Click **Start game**.
2. Show one hand to the camera.
3. Listen to the countdown: **Rock**, **Paper**, **Scissors**, **Shoot!**
4. Make your hand sign when the game says **Shoot!**
5. The game shows the result, then automatically starts the next round with
   the same spoken countdown.
6. After Round 5, review the final score.
7. Click **Play again** to start a new five-round match.

You only press **Start game** once at the beginning. You do not need to press
**Play again** between rounds.

Use **Voice on/off** if the activity needs to be quiet. If the camera cannot
clearly see a gesture, that round repeats instead of counting as a round.

Gestures:

- Rock: closed fist
- Paper: open hand
- Scissors: index and middle fingers raised

The player needs to reach a well-lit position where one hand is visible.
The game confirms a gesture after it remains steady for several camera frames.
If the camera cannot recognize the hand, use the manual move buttons below the
camera.

## Stop the game

Return to the PowerShell window running the server and press:

```text
Ctrl + C
```

If the server is already running, simply refresh the browser page instead of
starting a second server.

## Recent child-friendly upgrades

The browser game now includes welcome instructions, configurable 3- or 5-round
matches, round progress dots, fullscreen mode, a dedicated camera stop button,
high-contrast mode, Charlie reactions, confetti for a player match win, and
local score history. History stays in this browser and does not contain names
or other personal information.

The service worker caches the app and MediaPipe resources after the first
successful online load. Start the game once while connected to the internet;
after that, the cached app and downloaded detector resources can usually be
opened without internet. Clear the browser site data if you need to refresh
cached resources.

## Troubleshooting

### "Camera could not start"

Try the following:

1. Confirm that the browser camera permission is **Allow**.
2. Close Zoom, Teams, OBS, or other applications using the webcam.
3. Refresh using `Ctrl + Shift + R`.
4. Confirm that the correct webcam is selected in the browser camera settings.
5. Check Windows camera privacy settings.

### "The camera is already being used"

This means another browser tab or application has opened the webcam. Close
duplicate game tabs and applications such as Zoom, Teams, OBS, WhatsApp, or
the Windows Camera app. Leave one game tab open, then refresh the page and
click **Try again**.

If the browser still reports the camera is busy, close all game tabs, close
Chrome or Edge completely, reopen one browser window, and start the server
again if necessary.

### The camera works but an old error message is visible

Use a hard refresh:

```text
Ctrl + Shift + R
```

If yellow hand landmarks are visible on the camera image, the camera and hand
detector are working. The old message can be ignored after refreshing.

### The game page does not load

Confirm that the PowerShell window is still running:

```powershell
py -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

### The hand is visible but the gesture is unclear

- Use better lighting.
- Keep only one hand in view.
- Move the hand farther from or closer to the camera.
- Keep the full hand inside the camera frame.
- Hold the gesture steady during `SHOOT!`.

### The computer hand or detector does not load

The browser version downloads MediaPipe resources from a CDN. Check the
internet connection and reload the page. Browser developer errors can be
viewed with `F12`, then selecting the **Console** tab.

### Voice does not play

Check that:

- The computer volume is turned up.
- The browser tab is not muted.
- The operating system has an English speech voice installed.
- The browser allows speech after clicking **Start game**.

The game prefers an `en-ZA` voice, then falls back to `en-GB` and `en-US`.
The exact available voice depends on the computer.

## Python utilities

The browser game is the main application. The Python files are development
and testing utilities.

Do not run `py hand_test.py` to start the browser game. That command opens the
separate Python webcam test window. To start the browser game, use the local
web server command in the **Run the browser game** section.

Install their dependencies:

```powershell
py -m pip install opencv-python mediapipe
```

Test the webcam:

```powershell
py test_camera.py
```

Test Python hand detection:

```powershell
py hand_test.py
```

Record hand samples:

```powershell
py record_letter.py
```

`record_letter.py` saves samples in the local `letters` folder. Its current
letter-recording workflow is separate from the browser Rock, Paper, Scissors
game.

## Privacy and safeguarding

- The camera is used locally by the browser.
- The game does not intentionally record or upload video.
- No player names or personal information are required.
- Camera access should be granted only on the trusted local game computer.
- Close the browser tab after the activity is finished.

## Future improvements

Possible next improvements include:

- A mute button
- A gesture instruction screen
- Large visual icons for Rock, Paper, and Scissors
- Difficulty or speed settings
- Offline bundling of the MediaPipe browser resources
- A dedicated desktop or mobile application
- More accessibility options and language support
