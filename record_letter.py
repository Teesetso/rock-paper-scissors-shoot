import cv2
import json
import os

from hand_tracking import create_hand_landmarker, detect_hand, draw_landmarks

# --- CONFIG ---
LETTERS = list("ABDEGHLOW")   # letters needed for HELLO, LEO, BALL, DOG, OWL
SAMPLES_PER_LETTER = 3
OUT_DIR = os.path.join(os.path.dirname(__file__), "letters")
os.makedirs(OUT_DIR, exist_ok=True)

hands = create_hand_landmarker()

cap = cv2.VideoCapture(0)
if not cap.isOpened():
    print("Could not open camera")
    exit()

idx = 0
timestamp_ms = 0
print("=== RECORDING MODE ===")
print(f"Letters to record: {' '.join(LETTERS)}")
print(f"{SAMPLES_PER_LETTER} samples each")
print("SPACE = save sample    N = next    P = prev    Q = quit")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    timestamp_ms += 33
    results = detect_hand(hands, frame, timestamp_ms)

    hand_present = False
    current_landmarks = None

    if results.hand_landmarks:
        hand_present = True
        hand_landmarks = results.hand_landmarks[0]
        draw_landmarks(frame, hand_landmarks)
        current_landmarks = [(lm.x, lm.y, lm.z) for lm in hand_landmarks]

    letter = LETTERS[idx]
    existing = len([f for f in os.listdir(OUT_DIR)
                    if f.startswith(f"{letter}_") and f.endswith(".json")])

    cv2.rectangle(frame, (0, 0), (frame.shape[1], 100), (0, 0, 0), -1)
    cv2.putText(frame, f"LETTER: {letter}   ({idx+1}/{len(LETTERS)})",
                (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.1, (0, 255, 255), 2)
    cv2.putText(frame, f"Samples: {existing}/{SAMPLES_PER_LETTER}",
                (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                (0, 255, 0) if existing >= SAMPLES_PER_LETTER else (0, 165, 255), 2)

    if hand_present:
        cv2.putText(frame, "HAND OK", (frame.shape[1] - 160, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)
    else:
        cv2.putText(frame, "NO HAND", (frame.shape[1] - 160, 40),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 255), 2)

    cv2.putText(frame, "SPACE=save   N=next   P=prev   Q=quit",
                (20, frame.shape[0] - 15),
                cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)

    cv2.imshow("Record Letters - press Q to quit", frame)

    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord('n'):
        idx = min(idx + 1, len(LETTERS) - 1)
    elif key == ord('p'):
        idx = max(idx - 1, 0)
    elif key == ord(' '):
        if current_landmarks is None:
            print(f"[{letter}] No hand detected - not saved")
        else:
            n = len([f for f in os.listdir(OUT_DIR)
                     if f.startswith(f"{letter}_") and f.endswith(".json")]) + 1
            path = os.path.join(OUT_DIR, f"{letter}_{n}.json")
            with open(path, "w") as f:
                json.dump({"letter": letter, "landmarks": current_landmarks}, f)
            print(f"[{letter}] Saved sample {n}: {path}")

cap.release()
hands.close()
cv2.destroyAllWindows()