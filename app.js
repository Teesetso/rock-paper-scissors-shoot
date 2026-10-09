import { FilesetResolver, HandLandmarker } from
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/+esm";

const video = document.querySelector("#camera");
const canvas = document.querySelector("#landmarks");
const context = canvas.getContext("2d");
const startButton = document.querySelector("#start-button");
const muteButton = document.querySelector("#mute-button");
const playAgainButton = document.querySelector("#play-again-button");
const computerHand = document.querySelector("#computer-hand");
const countdown = document.querySelector("#countdown");
const status = document.querySelector("#status");
const playerChoice = document.querySelector("#player-choice");
const computerChoice = document.querySelector("#computer-choice");
const cameraMessage = document.querySelector("#camera-message");
const gestureStatus = document.querySelector("#gesture-status");
const playerScore = document.querySelector("#player-score");
const computerScore = document.querySelector("#computer-score");
const roundNumber = document.querySelector("#round-number");
const resultCard = document.querySelector("#result-card");
const resultPlayer = document.querySelector("#result-player");
const resultPlayerLabel = document.querySelector("#result-player-label");
const resultComputer = document.querySelector("#result-computer");
const resultComputerLabel = document.querySelector("#result-computer-label");
const resultMessage = document.querySelector("#result-message");
const moveButtons = [...document.querySelectorAll(".move-button")];
const settingsButton = document.querySelector("#settings-button");
const settingsDialog = document.querySelector("#settings-dialog");
const roundSetting = document.querySelector("#round-setting");
const accessibleSetting = document.querySelector("#accessible-setting");
const fullscreenButton = document.querySelector("#fullscreen-button");
const stopCameraButton = document.querySelector("#stop-camera-button");
const roundProgress = document.querySelector("#round-progress");
const roundTotalLabel = document.querySelector("#round-total-label");
const historySummary = document.querySelector("#history-summary");

const gestures = {
  rock: { label: "Rock", emoji: "✊" },
  paper: { label: "Paper", emoji: "✋" },
  scissors: { label: "Scissors", emoji: "✌️" },
};
let handLandmarker;
let stream;
let animationFrame;
let currentGesture = null;
let stableGesture = null;
let candidateGesture = null;
let candidateFrames = 0;
let manualGesture = null;
let scores = { player: 0, computer: 0 };
let round = 1;
let roundActive = false;
let matchOver = false;
let voiceMuted = false;
let totalRounds = Number(localStorage.getItem("rps-rounds")) || 5;
let audioContext;

function speak(message) {
  return new Promise(resolve => {
    if (voiceMuted || !("speechSynthesis" in window)) {
      resolve();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(candidate => candidate.lang.toLowerCase() === "en-za") ||
      voices.find(candidate => candidate.lang.toLowerCase().startsWith("en-gb")) ||
      voices.find(candidate => candidate.lang.toLowerCase().startsWith("en-us"));
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    let finished = false;
    let fallbackTimer;
    const finish = () => {
      if (!finished) {
        finished = true;
        clearTimeout(fallbackTimer);
        resolve();
      }
    };
    utterance.onend = finish;
    utterance.onerror = finish;
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
    // Keep the fallback well beyond the normal speech duration so the next
    // countdown word never cancels the current one prematurely.
    fallbackTimer = setTimeout(finish, Math.max(3000, message.length * 240));
  });
}

function speakRandom(messages) {
  return speak(messages[Math.floor(Math.random() * messages.length)]);
}

function fingerIsUp(points, tip, pip) {
  const wrist = points[0];
  const distance = point => Math.hypot(point.x - wrist.x, point.y - wrist.y);
  return distance(points[tip]) > distance(points[pip]) * 1.05;
}

function recogniseGesture(points) {
  const index = fingerIsUp(points, 8, 6);
  const middle = fingerIsUp(points, 12, 10);
  const ring = fingerIsUp(points, 16, 14);
  const pinky = fingerIsUp(points, 20, 18);
  const extended = [index, middle, ring, pinky].filter(Boolean).length;
  if (extended >= 3) return "paper";
  if (index && middle && !ring && !pinky) return "scissors";
  if (extended <= 1) return "rock";
  return null;
}

function updateProgress() {
  roundTotalLabel.textContent = `${totalRounds} rounds`;
  roundProgress.innerHTML = Array.from({ length: totalRounds }, (_, index) => {
    const state = index + 1 < round ? "complete" : index + 1 === round ? "active" : "";
    return `<span class="progress-dot ${state}" aria-label="Round ${index + 1}"></span>`;
  }).join("");
}

function playTone(frequency, duration = .12) {
  if (!audioContext) audioContext = new AudioContext();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(.04, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, audioContext.currentTime + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

function updateHistory() {
  const history = JSON.parse(localStorage.getItem("rps-history") || '{"games":0,"player":0,"computer":0,"draws":0}');
  historySummary.textContent = `Games: ${history.games} · You: ${history.player} · Charlie: ${history.computer} · Draws: ${history.draws}`;
}

function saveMatchResult() {
  const history = JSON.parse(localStorage.getItem("rps-history") || '{"games":0,"player":0,"computer":0,"draws":0}');
  history.games++;
  if (scores.player > scores.computer) history.player++;
  else if (scores.computer > scores.player) history.computer++;
  else history.draws++;
  localStorage.setItem("rps-history", JSON.stringify(history));
  updateHistory();
}

function celebrate() {
  for (let index = 0; index < 28; index++) {
    const piece = document.createElement("span");
    piece.className = "confetti";
    piece.style.left = `${Math.random() * 100}vw`;
    piece.style.background = ["#ff6b6b", "#ffd166", "#5dd39e", "#7c5cff"][index % 4];
    piece.style.animationDelay = `${Math.random() * .35}s`;
    document.body.append(piece);
    setTimeout(() => piece.remove(), 1700);
  }
}

function drawLandmarks(points) {
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#ffd166";
  for (const point of points) {
    context.beginPath();
    context.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, Math.PI * 2);
    context.fill();
  }
}

function detectFrame() {
  if (video.readyState >= 2 && handLandmarker) {
    cameraMessage.hidden = true;
    const result = handLandmarker.detectForVideo(video, performance.now());
    const points = result.landmarks?.[0];
    if (points) {
      drawLandmarks(points);
      const detectedGesture = recogniseGesture(points);
      if (detectedGesture && detectedGesture === candidateGesture) {
        candidateFrames++;
      } else {
        candidateGesture = detectedGesture;
        candidateFrames = detectedGesture ? 1 : 0;
      }
      if (candidateFrames >= 5) {
        stableGesture = candidateGesture;
        currentGesture = manualGesture || stableGesture;
        gestureStatus.dataset.state = "ready";
        gestureStatus.textContent = `● Ready: ${gestures[currentGesture].label}`;
        if (!roundActive) {
          playerChoice.textContent = `Ready: ${gestures[currentGesture].label}`;
        }
      } else {
        gestureStatus.dataset.state = "unclear";
        gestureStatus.textContent = "● Hold your hand steady";
      }
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
      candidateGesture = null;
      candidateFrames = 0;
      stableGesture = null;
      currentGesture = null;
      gestureStatus.dataset.state = "waiting";
      gestureStatus.textContent = "● Show one hand to begin";
      if (!roundActive) playerChoice.textContent = "Show your hand";
    }
  }
  animationFrame = requestAnimationFrame(detectFrame);
}

async function setupCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  video.srcObject = stream;
  cameraMessage.hidden = true;

  await video.play();
  cameraMessage.hidden = true;
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm"
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
    },
    runningMode: "VIDEO",
    numHands: 1,
    minHandDetectionConfidence: .6,
    minHandPresenceConfidence: .6,
    minTrackingConfidence: .6,
  });
  detectFrame();
}

function winner(player, computer) {
  if (player === computer) return "draw";
  if ((player === "rock" && computer === "scissors") ||
      (player === "paper" && computer === "rock") ||
      (player === "scissors" && computer === "paper")) return "player";
  return "computer";
}

function wait(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function countdownToNextRound() {
  for (const word of ["Rock", "Paper", "Scissors"]) {
    countdown.textContent = word;
    status.textContent = "Get ready!";
    await speak(word);
    await wait(150);
  }
  countdown.textContent = "SHOOT!";
  await speak("Shoot!");
  await wait(350);
}

async function playRound() {
  if (roundActive || matchOver) return;
  roundActive = true;
  playAgainButton.disabled = true;
  startButton.disabled = true;
  currentGesture = manualGesture || null;
  moveButtons.forEach(button => button.classList.remove("selected"));
  playerChoice.textContent = "Make your hand sign...";
  computerChoice.textContent = "Shaking...";
  computerHand.textContent = "✊";
  computerHand.classList.add("shaking");
  for (const word of ["Rock", "Paper", "Scissors"]) {
    countdown.textContent = word;
    status.textContent = "Get ready!";
    await speak(word);
    await wait(150);
  }
  countdown.textContent = "SHOOT!";
  await speak("Shoot!");
  await wait(350);
  const player = manualGesture || currentGesture;
  manualGesture = null;
  const computer = Object.keys(gestures)[Math.floor(Math.random() * 3)];
  computerHand.classList.remove("shaking");
  computerHand.textContent = gestures[computer].emoji;
  computerChoice.textContent = gestures[computer].label;
  resultPlayer.textContent = player ? gestures[player].emoji : "❔";
  resultPlayerLabel.textContent = player ? gestures[player].label : "Not clear";
  resultComputer.textContent = gestures[computer].emoji;
  resultComputerLabel.textContent = gestures[computer].label;
  if (!player) {
    playerChoice.textContent = "No clear hand sign";
    status.textContent = "Show one clear hand sign. This round will repeat.";
    resultMessage.textContent = "Let's try this round again!";
    await speak("I could not see your hand. Let's try this round again!");
    roundActive = false;
    await playRound();
    return;
  } else {
    playerChoice.textContent = gestures[player].label;
    const result = winner(player, computer);
    if (result === "player") {
      scores.player++;
      computerHand.classList.add("sad");
      status.textContent = "You win! Great job!";
      resultMessage.textContent = "You win this round!";
      playTone(660);
      await speakRandom(["Awesome! You win!", "Great choice! You win!", "Well done!"]);
    } else if (result === "computer") {
      scores.computer++;
      computerHand.classList.add("happy");
      status.textContent = "Charlie wins this time!";
      resultMessage.textContent = "Good try! Keep going!";
      await speakRandom(["Good try! Let's play again!", "Charlie wins this round.", "Almost! You can do it!"]);
    } else {
      computerHand.classList.remove("happy", "sad");
      status.textContent = "It's a draw!";
      resultMessage.textContent = "It's a tie!";
      await speakRandom(["It's a tie! Try again!", "So close! Try one more time!"]);
    }
    playerScore.textContent = scores.player;
    computerScore.textContent = scores.computer;
  }

  if (round === totalRounds) {
    matchOver = true;
    saveMatchResult();
    playTone(scores.player >= scores.computer ? 880 : 220, .3);
    playAgainButton.textContent = "Play again";
    if (scores.player > scores.computer) {
      countdown.textContent = "YOU WON!";
      status.textContent = "You won the match!";
      resultMessage.textContent = "🎉 You won the game! 🎉";
      celebrate();
      speak("Congratulations! You won the game!");
    } else if (scores.computer > scores.player) {
      countdown.textContent = "GOOD TRY!";
      status.textContent = "Charlie won the match.";
      resultMessage.textContent = "Good try! Play again soon!";
      speak("Good try! Charlie won this game.");
    } else {
      countdown.textContent = "TIE GAME!";
      status.textContent = "The match is a tie!";
      resultMessage.textContent = "🎉 You both did great! 🎉";
      speak("It's a tie game! You both did great!");
    }
    computerHand.classList.remove("happy", "sad");
  } else {
    round++;
    roundNumber.textContent = `Round ${round}`;
    updateProgress();
    roundActive = false;
    await wait(1200);
    await playRound();
    return;
  }
  countdown.textContent = "Round over";
  playAgainButton.disabled = false;
  roundActive = false;
}

startButton.addEventListener("click", async () => {
  try {
    startButton.textContent = "Loading...";
    await setupCamera();
    startButton.hidden = true;
    status.textContent = "Camera ready!";
  } catch (error) {
    console.error(error);
    const cameraIsRunning = stream && stream.getVideoTracks().some(track => track.readyState === "live");
    if (error.name === "NotReadableError") {
      status.textContent = "The camera is already being used.";
      cameraMessage.hidden = false;
      cameraMessage.textContent = "Close other camera apps or game tabs, then try again.";
    } else if (cameraIsRunning) {
      status.textContent = "Camera is ready, but hand detection could not load.";
      cameraMessage.hidden = false;
      cameraMessage.textContent = "Hand detection is loading. Check your internet connection.";
    } else {
      status.textContent = "Camera could not start. Check browser permission.";
      cameraMessage.hidden = false;
      cameraMessage.textContent = "Please allow camera access and try again.";
    }
    startButton.disabled = false;
    startButton.textContent = "Try again";
    return;
  }
  await playRound();
});
playAgainButton.addEventListener("click", () => {
  if (matchOver) {
    scores = { player: 0, computer: 0 };
    round = 1;
    matchOver = false;
    playerScore.textContent = "0";
    computerScore.textContent = "0";
    roundNumber.textContent = "Round 1";
    playAgainButton.textContent = "Play again";
    resultPlayer.textContent = "❔";
    resultComputer.textContent = "❔";
    resultPlayerLabel.textContent = "Ready?";
    resultComputerLabel.textContent = "Waiting";
    resultMessage.textContent = "Make your hand sign when you see SHOOT!";
  }
  playRound();
});
document.querySelector("#reset-button").addEventListener("click", () => {
  scores = { player: 0, computer: 0 };
  playerScore.textContent = "0";
  computerScore.textContent = "0";
  round = 1;
  updateProgress();
  matchOver = false;
  roundNumber.textContent = "Round 1";
  playAgainButton.textContent = "Play again";
  status.textContent = "Score reset. Ready?";
  window.speechSynthesis?.cancel();
  roundActive = false;
  manualGesture = null;
  moveButtons.forEach(button => button.classList.remove("selected"));
});

settingsButton.addEventListener("click", () => settingsDialog.showModal());
roundSetting.value = String(totalRounds);
accessibleSetting.checked = localStorage.getItem("rps-accessible") === "true";
accessibleSetting.addEventListener("change", () => {
  document.body.classList.toggle("high-contrast", accessibleSetting.checked);
  localStorage.setItem("rps-accessible", String(accessibleSetting.checked));
});
roundSetting.addEventListener("change", () => {
  totalRounds = Number(roundSetting.value);
  localStorage.setItem("rps-rounds", String(totalRounds));
  round = 1;
  roundNumber.textContent = "Round 1";
  updateProgress();
});
fullscreenButton.addEventListener("click", async () => {
  if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
  else await document.exitFullscreen();
  fullscreenButton.textContent = document.fullscreenElement ? "⛶ Exit fullscreen" : "⛶ Fullscreen";
});
stopCameraButton.addEventListener("click", () => {
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  video.srcObject = null;
  handLandmarker = null;
  roundActive = false;
  startButton.hidden = false;
  startButton.disabled = false;
  startButton.textContent = "Start game";
  status.textContent = "Camera stopped.";
  gestureStatus.textContent = "● Camera is off";
});

muteButton.addEventListener("click", () => {
  voiceMuted = !voiceMuted;
  if (voiceMuted) window.speechSynthesis?.cancel();
  muteButton.textContent = voiceMuted ? "🔇 Voice off" : "🔊 Voice on";
  muteButton.setAttribute("aria-pressed", String(voiceMuted));
});

moveButtons.forEach(button => {
  button.addEventListener("click", () => {
    manualGesture = button.dataset.move;
    currentGesture = manualGesture;
    moveButtons.forEach(candidate => candidate.classList.toggle(
      "selected", candidate === button
    ));
    gestureStatus.dataset.state = "ready";
    gestureStatus.textContent = `● Selected: ${gestures[manualGesture].label}`;
    playerChoice.textContent = `Selected: ${gestures[manualGesture].label}`;
  });
});

document.body.classList.toggle("high-contrast", accessibleSetting.checked);
updateProgress();
updateHistory();
