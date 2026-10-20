"""
NETRADRISHTI Advanced Material Classification, Live Detection and Defect Localization Test Suite
Validates the 8 mandatory test cases defined in the problem specification:
1. Metal plate with no visible defect (Green overlay, 0 defects, PASS verdict)
2. Metal component with known scratch (Green overlay, localized scratch defect, FAIL/Review verdict)
3. Plastic or glass product (Red overlay, NON-METAL material, defect-free PASS)
4. Textile sample (Red overlay, NON-METAL material, fabric evaluation)
5. Scene containing both metal and non-metal products (Metal=Green, Non-metal=Red)
6. Scene with unrelated background objects (No fabricated corrosion/scratch on background)
7. Low-light or blurry image (Quality precheck -> Manual Review — Image quality insufficient)
8. Scene with no supported product (Awaiting workpiece, 0 false defects)
"""

import urllib.request
import json
import base64
import sys
import numpy as np
import cv2

BACKEND_URL = "http://127.0.0.1:8000"

def to_base64(img):
    _, buf = cv2.imencode(".png", img)
    return "data:image/png;base64," + base64.b64encode(buf).decode("utf-8")

def post_live_frame(frame, category="all", detect_objects=True, ref=None):
    b64 = to_base64(frame)
    payload = {
        "frame": b64,
        "category": category,
        "detectObjects": detect_objects,
        "confidenceThreshold": 0.25,
        "includeAnnotatedFrame": True
    }
    if ref is not None:
        payload["referenceImage"] = to_base64(ref)
    req_body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(f"{BACKEND_URL}/api/inspections/live/frame", data=req_body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

import os

SAMPLES_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "samples")

def test_case_1_clean_metal_plate():
    print("[CASE 1] Metal plate with no visible defect...")
    img = cv2.imread(os.path.join(SAMPLES_DIR, "metal_golden_ref.png"))
    assert img is not None, "metal_golden_ref.png must exist"
    
    data = post_live_frame(img, category="metal_surface")
    assert len(data["detectedObjects"]) >= 1, "Expected metal plate to be localized"
    obj = data["detectedObjects"][0]
    assert obj.get("material") == "metal", f"Expected material 'metal', got {obj.get('material')}"
    assert obj.get("materialColor") == "green", f"Expected materialColor 'green', got {obj.get('materialColor')}"
    assert len(data["suspiciousRegions"]) == 0, f"Expected 0 defects on clean plate, got {len(data['suspiciousRegions'])}"
    assert data["resultType"] == "no_issue", f"Expected 'no_issue', got {data['resultType']}"
    print(f"  PASS: Clean metal plate classified as METAL (Green), 0 defects, Verdict: {data['resultType']}")

def test_case_2_defective_metal_component():
    print("[CASE 2] Metal component with known scratch...")
    img = cv2.imread(os.path.join(SAMPLES_DIR, "metal_surface_defect.png"))
    assert img is not None, "metal_surface_defect.png must exist"

    data = post_live_frame(img, category="metal_surface")
    assert len(data["detectedObjects"]) >= 1, "Expected metal component to be localized"
    obj = data["detectedObjects"][0]
    assert obj.get("material") == "metal", f"Expected material 'metal', got {obj.get('material')}"
    assert len(data["suspiciousRegions"]) >= 1, "Expected scratch defect to be localized"
    defects = data["suspiciousRegions"]
    classes = [d.get("defectClass") for d in defects]
    assert any(c in ["scratch", "fracture", "burr", "porosity"] for c in classes), f"Expected defect class in {classes}"
    assert data["resultType"] in ["suspicious_region", "review_required"], f"Expected defect verdict, got {data['resultType']}"
    print(f"  PASS: Defective metal component classified as METAL (Green), localized defects: {classes}, Verdict: {data['resultType']}")

def test_case_3_plastic_glass_product():
    print("[CASE 3] Plastic or glass container product...")
    img = cv2.imread(os.path.join(SAMPLES_DIR, "bottle_golden_ref.png"))
    assert img is not None, "bottle_golden_ref.png must exist"
    data = post_live_frame(img, category="bottle")
    assert len(data["detectedObjects"]) >= 1, "Expected container to be localized"
    obj = data["detectedObjects"][0]
    assert obj.get("material") == "non_metal", f"Expected material 'non_metal', got {obj.get('material')}"
    assert obj.get("materialColor") == "red", f"Expected materialColor 'red', got {obj.get('materialColor')}"
    # Critical requirement: An object being red because it is non-metal must never be interpreted as a defect
    assert len(data["suspiciousRegions"]) == 0, f"Clean bottle should have 0 defects, got {len(data['suspiciousRegions'])}"
    assert data["resultType"] == "no_issue", f"Expected 'no_issue' for clean container, got {data['resultType']}"
    print(f"  PASS: Glass container classified as NON-METAL (Red) without false defects, Verdict: {data['resultType']}")

def test_case_4_textile_sample():
    print("[CASE 4] Textile fabric sample...")
    img = cv2.imread(os.path.join(SAMPLES_DIR, "textile_golden_ref.png"))
    assert img is not None, "textile_golden_ref.png must exist"
    data = post_live_frame(img, category="textile")
    assert len(data["detectedObjects"]) >= 1, "Expected textile to be localized"
    obj = data["detectedObjects"][0]
    assert obj.get("material") == "non_metal", f"Expected material 'non_metal', got {obj.get('material')}"
    assert obj.get("materialColor") == "red", f"Expected materialColor 'red', got {obj.get('materialColor')}"
    assert len(data["suspiciousRegions"]) == 0, f"Expected 0 defects on clean textile baseline, got {len(data['suspiciousRegions'])}"
    assert data["resultType"] == "no_issue", f"Expected 'no_issue', got {data['resultType']}"
    print(f"  PASS: Textile sample classified as NON-METAL (Red), 0 false defects, Verdict: {data['resultType']}")

def test_case_5_multi_product_metal_and_nonmetal():
    print("[CASE 5] Scene containing both metal and non-metal products...")
    canvas = np.full((400, 600, 3), 40, dtype=np.uint8)
    # Left: Machined metal disc
    cv2.circle(canvas, (180, 200), 90, (170, 175, 180), -1)
    # Right: Green glass container / bottle
    cv2.rectangle(canvas, (380, 80), (480, 340), (30, 140, 50), -1)

    data = post_live_frame(canvas, category="all")
    assert len(data["detectedObjects"]) >= 2, f"Expected >= 2 objects, got {len(data['detectedObjects'])}"
    materials = [o.get("material") for o in data["detectedObjects"]]
    assert "metal" in materials, f"Expected 'metal' in {materials}"
    assert "non_metal" in materials, f"Expected 'non_metal' in {materials}"
    metal_obj = next(o for o in data["detectedObjects"] if o.get("material") == "metal")
    nonmetal_obj = next(o for o in data["detectedObjects"] if o.get("material") == "non_metal")
    assert metal_obj.get("materialColor") == "green"
    assert nonmetal_obj.get("materialColor") == "red"
    print(f" PASS: Multi-product scene identified Metal ({metal_obj['label']}=Green) and Non-metal ({nonmetal_obj['label']}=Red)")

def test_case_6_unrelated_background_scene():
    print("[CASE 6] Scene with unrelated background objects (office/room clutter)...")
    # Simulate room background: desk wood gradient, shelves, laptop border
    bg = np.full((480, 640, 3), (120, 140, 160), dtype=np.uint8) # Desk wood/office wall
    cv2.line(bg, (0, 200), (640, 200), (90, 110, 130), 3) # Shelf line
    cv2.rectangle(bg, (50, 240), (280, 440), (70, 80, 90), 2) # Black monitor bezel
    cv2.rectangle(bg, (340, 300), (580, 460), (100, 105, 115), 2) # Keyboard boundary

    data = post_live_frame(bg, category="all")
    # Verify no fabricated defects across room background
    assert len(data["suspiciousRegions"]) == 0, f"Expected 0 defects on background, got {len(data['suspiciousRegions'])}"
    assert data["resultType"] in ["no_issue", "review_required"]
    print(f" PASS: Background scene produced 0 false defects and avoided fabricated corrosion/scratch labels.")

def test_case_7_low_light_or_blurry():
    print("[CASE 7] Low-light or blurry image...")
    # Flat low-brightness blurry frame
    blurry = np.full((320, 320, 3), 18, dtype=np.uint8)
    data = post_live_frame(blurry, category="all")
    assert data["resultType"] == "review_required", f"Expected 'review_required', got {data['resultType']}"
    assert "Manual Review" in data["summary"], f"Expected 'Manual Review' in summary, got {data['summary']}"
    assert data["imageQuality"]["isAcceptable"] is False
    print(f" PASS: Blurry/dark frame escalated to Manual Review: {data['summary']}")

def test_case_8_scene_with_no_product():
    print("[CASE 8] Scene with no supported product...")
    # Empty conveyor / inspection backdrop
    blank = np.zeros((400, 400, 3), dtype=np.uint8)
    for y in range(400):
        blank[y, :] = int(120 + 50 * (y / 400.0))
    cv2.line(blank, (0, 380), (400, 380), (100, 100, 100), 2)
    data = post_live_frame(blank, category="all")
    assert len(data["detectedObjects"]) == 0, f"Expected 0 objects, got {len(data['detectedObjects'])}"
    assert len(data["suspiciousRegions"]) == 0, f"Expected 0 defects, got {len(data['suspiciousRegions'])}"
    assert "Waiting for industrial workpiece" in data["summary"]
    print(f" PASS: Empty scene correctly reports waiting status without hallucinations: {data['summary']}")

if __name__ == "__main__":
    print("=" * 65)
    print("NETRADRISHTI Advanced Material & Localization Verification")
    print("=" * 65)
    test_case_1_clean_metal_plate()
    test_case_2_defective_metal_component()
    test_case_3_plastic_glass_product()
    test_case_4_textile_sample()
    test_case_5_multi_product_metal_and_nonmetal()
    test_case_6_unrelated_background_scene()
    test_case_7_low_light_or_blurry()
    test_case_8_scene_with_no_product()
    print("=" * 65)
    print("ALL 8 ADVANCED MATERIAL & LOCALIZATION TEST CASES PASSED! ")
