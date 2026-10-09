import cv2
from hand_tracking import create_hand_landmarker, detect_hand, draw_landmarks

hands = create_hand_landmarker()

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Could not open camera")
    exit()

print("Hand detection running. Press Q to quit.")
timestamp_ms = 0

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.flip(frame, 1)
    timestamp_ms += 33
    results = detect_hand(hands, frame, timestamp_ms)

    if results.hand_landmarks:
        for hand_landmarks in results.hand_landmarks:
            draw_landmarks(frame, hand_landmarks)
            # Print wrist position as a sanity check
            h, w, _ = frame.shape
            wrist = hand_landmarks[0]
            cx, cy = int(wrist.x * w), int(wrist.y * h)
            cv2.putText(frame, f"Hand detected ({cx},{cy})",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX,
                        0.7, (0, 255, 0), 2)

    cv2.imshow("Hand Detection - press Q to quit", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()