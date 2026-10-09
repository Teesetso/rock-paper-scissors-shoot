import cv2

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Could not open camera. Try changing 0 to 1.")
    exit()

print("✅ Camera opened. Press Q to quit.")

while True:
    ret, frame = cap.read()
    if not ret:
        print("❌ Failed to grab frame")
        break

    cv2.imshow("Camera Test - press Q to quit", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()