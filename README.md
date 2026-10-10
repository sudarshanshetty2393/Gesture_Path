# ISL Translator - Unified Platform

This project integrates ISL Translation, JASigning Avatar, and HamNoSys Builder into a single full-stack application.

## Features
- **Translate**: Convert text to Indian Sign Language (ISL) animations using a 3D avatar.
- **Builder**: Create custom gestures using the HamNoSys builder.
- **Library**: View and manage available signs.
- **Authentication**: User login and signup with history tracking.

## Sign → Text (camera)
Choose **Visual / ISL** as the input mode (output **Text** or **Audio**). The camera opens, and each
sign you make is recognised and added to the message box — lower your hands after each sign. You can
also upload a video of signs. Recognition runs entirely in the browser:

- `src/sign/` — MediaPipe Holistic landmarks → features → word segmentation → TensorFlow.js classifier.
  The engine runs in a hidden frame (`sign-engine.html`) because the avatar script `public/cwa/allcsa.js`
  replaces the browser's `WebAssembly`, which MediaPipe and TensorFlow.js need.
- `public/models/isl/` — the trained model (263 words, ~1.5 MB).
- Trained on the [INCLUDE dataset](https://zenodo.org/records/4010759) by AI4Bharat (CC BY 4.0), using
  their pre-extracted [pose data](https://zenodo.org/records/6674324). Held-out test accuracy: 95.0% top-1,
  99.1% top-3 (816 videos).

### Retraining the model (optional)
Needs Python 3.12 and ~1 GB disk; the dataset is not committed (`training/` is gitignored).
```bash
python3.12 -m venv training/venv && training/venv/bin/pip install numpy tensorflow
curl -L -o training/INCLUDE.zip 'https://zenodo.org/records/6674324/files/INCLUDE.zip?download=1'
unzip training/INCLUDE.zip -d training/raw && cd training/raw/INCLUDE \
  && unzip Pose_Signs.zip -d signs && unzip Train_Test_Split.zip -d split && cd -
training/venv/bin/python ml/prepare.py training/raw/INCLUDE training/include_raw.npz
training/venv/bin/python ml/test_parity.py training/include_raw.npz   # Python vs browser features
training/venv/bin/python ml/train.py training/include_raw.npz training/out
node ml/export_tfjs.mjs training/out                                   # -> public/models/isl/
```
`ml/features.py` and `src/sign/features.ts` must stay identical — `ml/test_parity.py` checks this.

## Testing on a phone (local network)
Phones only allow the camera on HTTPS pages, so use the phone dev mode:
```bash
node server/server.js     # backend on this machine
npm run dev:phone         # HTTPS dev server on your Wi-Fi; API calls are proxied to the backend
```
Open the printed `Network: https://<your-ip>:5173` address on the phone (same Wi-Fi) and accept the
self-signed certificate warning. Add `?debug=1` to the URL to show the sign-recognition debug panel
(frames per second, shoulders/hands detected, segmenter state, last top-3 guesses); `?debug=0` hides it.

## Prerequisites
- Node.js (v16+)
- NPM

## Setup

1.  **Install Dependencies**
    ```bash
    npm install
    cd server
    npm install
    cd ..
    ```

2.  **Start the Backend Server**
    ```bash
    node server/server.js
    ```
    The server runs on `http://localhost:5000`.

3.  **Start the Frontend**
    ```bash
    npm run dev
    ```
    The application runs on `http://localhost:5173`.

## Directory Structure
- `src/`: React frontend code.
- `server/`: Node.js backend code.
- `public/cwa/`: JASigning avatar assets.
- `public/builder_assets/`: HamNoSys builder assets.
- `server/data/`: SiGML data files.

## Usage
1.  Open the app in your browser.
2.  Login or Sign up.
3.  Use the **Translate** tab to convert text to sign language.
4.  Use the **Builder** tab to create new signs.
5.  Use the **Library** tab to browse signs.
