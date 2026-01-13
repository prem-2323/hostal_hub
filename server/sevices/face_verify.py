import sys
import json
import base64
import cv2
import numpy as np

def verify_faces(ref_b64, selfie_b64):
    try:
        # Decode images
        nparr_ref = np.frombuffer(base64.b64decode(ref_b64.split(',')[-1]), np.uint8)
        img_ref = cv2.imdecode(nparr_ref, cv2.IMREAD_COLOR)

        nparr_selfie = np.frombuffer(base64.b64decode(selfie_b64.split(',')[-1]), np.uint8)
        img_selfie = cv2.imdecode(nparr_selfie, cv2.IMREAD_COLOR)

        if img_ref is None or img_selfie is None:
            return {"match": False, "similarity": 0, "message": "Could not decode images."}

        # Basic Face Detection with looser parameters
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Loosen detection parameters for dev
        faces_ref = face_cascade.detectMultiScale(img_ref, 1.05, 3)
        faces_selfie = face_cascade.detectMultiScale(img_selfie, 1.05, 3)

        if len(faces_selfie) == 0:
            return {"match": False, "similarity": 0, "message": "No face detected in capture! Please look at the camera."}

        # Histogram comparison
        hist_ref = cv2.calcHist([img_ref], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        cv2.normalize(hist_ref, hist_ref)
        
        hist_selfie = cv2.calcHist([img_selfie], [0, 1, 2], None, [8, 8, 8], [0, 256, 0, 256, 0, 256])
        cv2.normalize(hist_selfie, hist_selfie)

        similarity = cv2.compareHist(hist_ref, hist_selfie, cv2.HISTCMP_CORREL)
        
        # threshold set to 0.1 for dev to be very permissive
        match = similarity > 0.1 

        return {
            "match": bool(match),
            "similarity": float(similarity),
            "message": f"Face verified (Sim: {similarity:.2f})" if match else f"Face mismatch! Is that you? (Sim: {similarity:.2f})"
        }

    except Exception as e:
        return {"match": False, "similarity": 0, "error": str(e)}

if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        if not input_data:
            sys.exit(0)
            
        data = json.loads(input_data)
        result = verify_faces(data.get('reference', ''), data.get('selfie', ''))
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({"match": False, "error": str(e)}))
