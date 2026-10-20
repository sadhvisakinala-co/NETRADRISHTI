"""
NETRADRISHTI Backend Verification Test Suite
Executes automated tests against the running FastAPI OpenCV microservice.
"""

import urllib.request
import json
import base64
import sys

try:
    import cv2
    import numpy as np
except ImportError:
    print("Error: cv2 and numpy must be installed in python environment.")
    sys.exit(1)

BACKEND_URL = "http://127.0.0.1:8000"

def to_base64(img):
    _, buf = cv2.imencode(".png", img)
    return "data:image/png;base64," + base64.b64encode(buf).decode("utf-8")

def test_health():
    print("[TEST 1] Verifying Backend Health Check Endpoint...")
    req = urllib.request.Request(f"{BACKEND_URL}/health")
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
        assert resp.status == 200, f"Expected 200, got {resp.status}"
        assert data.get("status") == "ok", "Expected status 'ok'"
        assert data.get("opencv_available") is True, "Expected opencv_available to be True"
        print(f" PASS: Health endpoint operational (OpenCV Loaded: {data['opencv_available']})")

def test_clean_sample():
    print("[TEST 2] Verifying Clean/Normal Sample Inspection...")
    # Natural textured gray surface without cracks
    rng = np.random.RandomState(42)
    img = np.full((256, 256, 3), 160, dtype=np.uint8)
    noise = rng.normal(0, 10, (256, 256, 3)).astype(np.int16)
    img = np.clip(img.astype(np.int16) + noise, 0, 255).astype(np.uint8)

    b64 = to_base64(img)
    req_body = json.dumps({"productImage": b64, "category": "electronics"}).encode("utf-8")
    req = urllib.request.Request(f"{BACKEND_URL}/inspect", data=req_body, headers={"Content-Type": "application/json"})

    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())["result"]
        assert res["type"] == "no_issue", f"Expected 'no_issue', got {res['type']}"
        assert res["imageQuality"]["isAcceptable"] is True
        assert len(res["suspiciousRegions"]) == 0
        print(f" PASS: Clean sample passed baseline check (Verdict: {res['type']}, Score: {res['imageQuality']['score']})")

def test_defect_sample():
    print("[TEST 3] Verifying Defect Sample Detection (Cracks & Surface Voids)...")
    img = np.full((256, 256, 3), 160, dtype=np.uint8)
    cv2.line(img, (30, 40), (220, 200), (10, 10, 10), 6) # fracture
    cv2.circle(img, (180, 60), 20, (15, 15, 15), -1) # void

    b64 = to_base64(img)
    req_body = json.dumps({"productImage": b64, "category": "pcb"}).encode("utf-8")
    req = urllib.request.Request(f"{BACKEND_URL}/inspect", data=req_body, headers={"Content-Type": "application/json"})

    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())["result"]
        assert res["type"] == "suspicious_region", f"Expected 'suspicious_region', got {res['type']}"
        assert len(res["suspiciousRegions"]) >= 2, f"Expected >= 2 anomalies, found {len(res['suspiciousRegions'])}"
        print(f" PASS: Anomaly detector identified {len(res['suspiciousRegions'])} defects (Verdict: {res['type']})")

def test_blurry_sample():
    print("[TEST 4] Verifying Low-Quality / Blurred Sample Precheck Escalation...")
    # Flat dark zero-detail blurry surface
    img = np.full((256, 256, 3), 25, dtype=np.uint8)

    b64 = to_base64(img)
    req_body = json.dumps({"productImage": b64, "category": "beverage"}).encode("utf-8")
    req = urllib.request.Request(f"{BACKEND_URL}/inspect", data=req_body, headers={"Content-Type": "application/json"})

    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())["result"]
        assert res["type"] == "review_required", f"Expected 'review_required', got {res['type']}"
        assert res["imageQuality"]["isAcceptable"] is False
        print(f" PASS: Quality precheck escalated blurry image (Verdict: {res['type']}, Acceptable: {res['imageQuality']['isAcceptable']})")

def test_live_camera_frame():
    print("[TEST 5] Verifying Real-time Live Camera Frame Pipeline (/api/inspections/live/frame)...")
    rng = np.random.RandomState(42)
    frame = np.full((480, 640, 3), 160, dtype=np.uint8)
    noise = rng.normal(0, 15, (480, 640, 3)).astype(np.int16)
    frame = np.clip(frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    # Add candidate anomalous defect region
    cv2.rectangle(frame, (120, 150), (220, 250), (15, 15, 15), -1)
    
    b64_frame = to_base64(frame)
    payload = json.dumps({
        "frame": b64_frame,
        "category": "bottle",
        "profile": "high_precision",
        "blurThreshold": 0.35,
        "minAnomalyArea": 40.0,
        "includeAnnotatedFrame": True,
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{BACKEND_URL}/api/inspections/live/frame",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode())
        assert "processingTimeMs" in data
        assert "suspiciousRegions" in data
        assert len(data["suspiciousRegions"]) >= 1, f"Expected at least 1 detected anomaly in frame, got {len(data['suspiciousRegions'])}"
        assert data["annotatedFrame"] is not None and data["annotatedFrame"].startswith("data:image/jpeg;base64,")
        print(f" PASS: Live frame processed in {data['processingTimeMs']}ms with {len(data['suspiciousRegions'])} localized region(s) (Annotated frame generated).")

def test_live_camera_reference_diff():
    print("[TEST 6] Verifying Reference-based Live Frame Comparison...")
    rng = np.random.RandomState(42)
    ref_frame = np.full((480, 640, 3), 160, dtype=np.uint8)
    noise = rng.normal(0, 15, (480, 640, 3)).astype(np.int16)
    ref_frame = np.clip(ref_frame.astype(np.int16) + noise, 0, 255).astype(np.uint8)
    
    # Inspection frame with anomalous circle defect
    test_frame = ref_frame.copy()
    cv2.circle(test_frame, (320, 240), 30, (20, 20, 20), -1)

    payload = json.dumps({
        "frame": to_base64(test_frame),
        "referenceImage": to_base64(ref_frame),
        "category": "bottle",
        "profile": "standard",
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{BACKEND_URL}/api/inspections/live/frame",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode())
        assert data["hasReference"] is True
        assert data["alignmentQuality"] is not None
        assert len(data["suspiciousRegions"]) >= 1
        print(f" PASS: Reference delta subtraction localized anomaly with alignment quality {data['alignmentQuality']}.")

def test_inspection_persistence():
    print("[TEST 7] Verifying Live Session Disk Persistence (/api/inspections/save)...")
    import uuid
    session_id = f"test-live-{uuid.uuid4().hex[:8]}"
    record = {
        "id": session_id,
        "productCategory": "bottle",
        "inspectionProfile": "standard",
        "source": "live_camera",
        "status": "completed",
        "result": {
            "type": "no_issue",
            "summary": "Live inspection passed without defects.",
            "suspiciousRegions": [],
        },
        "events": [],
    }
    payload = json.dumps(record).encode("utf-8")
    req = urllib.request.Request(
        f"{BACKEND_URL}/api/inspections/save",
        data=payload,
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        saved = json.loads(resp.read().decode())
        assert saved.get("status") == "saved"

    # Verify retrieval
    get_req = urllib.request.Request(f"{BACKEND_URL}/api/inspections/{session_id}")
    with urllib.request.urlopen(get_req) as resp:
        assert resp.status == 200
        fetched = json.loads(resp.read().decode())
        assert fetched["id"] == session_id
        assert fetched["source"] == "live_camera"
        print(f" PASS: Persisted live inspection record verified on disk (ID: {session_id}).")


def test_metal_surface_inspection():
    print("[TEST 8] Verifying Metal Surface Inspection Pipeline (Scratches & Pitting)...")
    # Generate realistic machined metal plate with radial gouge and porosity pit
    w, h = 300, 300
    metal_img = np.full((h, w, 3), 110, dtype=np.uint8)
    cv2.circle(metal_img, (150, 150), 90, (140, 140, 140), 2)
    # Scratch defect
    cv2.line(metal_img, (80, 80), (180, 160), (20, 20, 20), 4)
    # Porosity pit
    cv2.circle(metal_img, (210, 210), 12, (15, 15, 15), -1)

    b64 = to_base64(metal_img)
    req_body = json.dumps({"productImage": b64, "category": "metal_surface", "profile": "detailed"}).encode("utf-8")
    req = urllib.request.Request(f"{BACKEND_URL}/inspect", data=req_body, headers={"Content-Type": "application/json"})

    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())["result"]
        assert len(res["suspiciousRegions"]) >= 2, f"Expected >= 2 metal defects, got {len(res['suspiciousRegions'])}"
        defect_classes = [r.get("defectClass") for r in res["suspiciousRegions"]]
        assert any(c in ["scratch", "fracture", "pitting"] for c in defect_classes), f"Expected classified metal defect types, got {defect_classes}"
        print(f" PASS: Metal inspection classified defects: {defect_classes} (Verdict: {res['type']})")

def test_object_detection():
    print("[TEST 9] Verifying Object Detection Pipeline (/api/detect/objects)...")
    # Create image containing a machined circular flange and a container
    canvas = np.full((400, 500, 3), 30, dtype=np.uint8)
    # Draw bottle
    cv2.rectangle(canvas, (50, 80), (140, 340), (45, 140, 65), -1)
    # Draw circular metal disc
    cv2.circle(canvas, (320, 200), 80, (130, 140, 150), -1)

    b64 = to_base64(canvas)
    req_body = json.dumps({
        "image": b64,
        "confidenceThreshold": 0.30,
        "includeAnnotatedImage": True
    }).encode("utf-8")
    req = urllib.request.Request(f"{BACKEND_URL}/api/detect/objects", data=req_body, headers={"Content-Type": "application/json"})

    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode())
        assert data.get("status") == "success"
        assert data.get("objectCount") >= 1, f"Expected detected objects, got {data.get('objectCount')}"
        assert data.get("annotatedImage") is not None
        print(f" PASS: Object detector identified {data['objectCount']} component(s) in {data['processingTimeMs']}ms: {[o['label'] for o in data['objects']]}")

def test_datasets_api():
    print("[TEST 10] Verifying Datasets API & Sample Asset Serving (/api/datasets)...")
    req = urllib.request.Request(f"{BACKEND_URL}/api/datasets")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode())
        datasets = data.get("datasets", [])
        assert len(datasets) == 4, f"Expected 4 standard benchmark suites, got {len(datasets)}"
        # Verify static preview access for each dataset
        for ds in datasets:
            img_url = f"{BACKEND_URL}{ds['targetPreview']}"
            img_req = urllib.request.Request(img_url)
            with urllib.request.urlopen(img_req) as img_resp:
                assert img_resp.status == 200, f"Sample image {img_url} returned status {img_resp.status}"
        print(f" PASS: All 4 dataset benchmark suites accessible with verified static sample assets.")

def test_live_continuous_object_and_metal_frame():
    print("[TEST 11] Verifying Continuous Live Frame Pipeline with Object Detection & Metal Defects...")
    # Generate live camera frame of a metal component with scratch
    w, h = 320, 320
    frame = np.full((h, w, 3), 120, dtype=np.uint8)
    # Circular metal flange
    cv2.circle(frame, (160, 160), 100, (140, 145, 150), -1)
    # Scratch defect on flange
    cv2.line(frame, (100, 100), (190, 180), (15, 15, 15), 3)

    b64 = to_base64(frame)
    req_body = json.dumps({
        "frame": b64,
        "category": "metal_surface",
        "detectObjects": True,
        "confidenceThreshold": 0.35,
        "includeAnnotatedFrame": True
    }).encode("utf-8")
    req = urllib.request.Request(f"{BACKEND_URL}/api/inspections/live/frame", data=req_body, headers={"Content-Type": "application/json"})

    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        data = json.loads(resp.read().decode())
        assert "detectedObjects" in data, "Missing detectedObjects in live frame response"
        assert "suspiciousRegions" in data, "Missing suspiciousRegions in live frame response"
        assert data.get("annotatedFrame") is not None, "Missing composite annotated frame"
        assert data.get("processingTimeMs") is not None
        print(f" PASS: Continuous live frame detected {data.get('objectCount')} object(s) and {data.get('defectCount')} defect(s) in {data['processingTimeMs']}ms (Verdict: {data['resultType']}).")

def test_bottle_inspection_sample():
    print("[TEST 12] Verifying Dedicated Industrial Bottle Pipeline (/samples/bottle)...")
    img = cv2.imread("public/samples/bottle_surface_defect.png")
    assert img is not None, "Missing sample bottle image"
    b64 = to_base64(img)
    req_body = json.dumps({"productImage": b64, "category": "bottle", "profile": "detailed"}).encode("utf-8")
    req = urllib.request.Request(f"{BACKEND_URL}/inspect", data=req_body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())["result"]
        assert len(res["suspiciousRegions"]) >= 1, f"Expected fracture defect in bottle, got {len(res['suspiciousRegions'])}"
        assert res["type"] == "suspicious_region", f"Expected suspicious_region, got {res['type']}"
        classes = [r.get("defectClass") for r in res["suspiciousRegions"]]
        print(f" PASS: Bottle pipeline detected fracture defect: {classes} (Verdict: {res['type']})")

def test_pcb_inspection_sample():
    print("[TEST 13] Verifying Dedicated SMT Electronic PCB Pipeline (/samples/pcb)...")
    img = cv2.imread("public/samples/pcb_surface_defect.png")
    assert img is not None, "Missing sample pcb image"
    b64 = to_base64(img)
    req_body = json.dumps({"productImage": b64, "category": "pcb", "profile": "detailed"}).encode("utf-8")
    req = urllib.request.Request(f"{BACKEND_URL}/inspect", data=req_body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())["result"]
        assert len(res["suspiciousRegions"]) >= 2, f"Expected >= 2 PCB defects, got {len(res['suspiciousRegions'])}"
        assert res["type"] == "suspicious_region", f"Expected suspicious_region, got {res['type']}"
        classes = [r.get("defectClass") for r in res["suspiciousRegions"]]
        print(f" PASS: PCB pipeline detected SMT defects: {classes} (Verdict: {res['type']})")

def test_textile_inspection_sample():
    print("[TEST 14] Verifying Dedicated Woven Fabric Textile Pipeline (/samples/textile)...")
    img = cv2.imread("public/samples/textile_surface_defect.png")
    assert img is not None, "Missing sample textile image"
    b64 = to_base64(img)
    req_body = json.dumps({"productImage": b64, "category": "textile", "profile": "detailed"}).encode("utf-8")
    req = urllib.request.Request(f"{BACKEND_URL}/inspect", data=req_body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())["result"]
        assert len(res["suspiciousRegions"]) >= 2, f"Expected >= 2 textile defects, got {len(res['suspiciousRegions'])}"
        assert res["type"] == "suspicious_region", f"Expected suspicious_region, got {res['type']}"
        classes = [r.get("defectClass") for r in res["suspiciousRegions"]]
        print(f" PASS: Textile pipeline detected fabric defects: {classes} (Verdict: {res['type']})")

def test_clean_industrial_baselines():
    print("[TEST 15] Verifying Clean Samples Pass Inspection with Zero False Positives...")
    categories = [
        ("bottle", "public/samples/bottle_golden_ref.png"),
        ("metal_surface", "public/samples/metal_golden_ref.png"),
        ("pcb", "public/samples/pcb_golden_ref.png"),
        ("textile", "public/samples/textile_golden_ref.png"),
    ]
    for cat, ref_path in categories:
        ref_img = cv2.imread(ref_path)
        assert ref_img is not None, f"Missing {ref_path}"
        b64 = to_base64(ref_img)
        req_body = json.dumps({"productImage": b64, "referenceImage": b64, "category": cat}).encode("utf-8")
        req = urllib.request.Request(f"{BACKEND_URL}/inspect", data=req_body, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req) as resp:
            assert resp.status == 200
            res = json.loads(resp.read().decode())["result"]
            assert len(res["suspiciousRegions"]) == 0, f"Expected 0 defects for clean {cat}, got {len(res['suspiciousRegions'])}"
            assert res["type"] == "no_issue", f"Expected 'no_issue' for clean {cat}, got {res['type']}"
    print(" PASS: All 4 clean industrial references verified 100% defect-free (Verdict: no_issue).")

if __name__ == "__main__":
    print("Starting NETRADRISHTI Backend Test Suite...\n" + "=" * 55)
    test_health()
    test_clean_sample()
    test_defect_sample()
    test_blurry_sample()
    test_live_camera_frame()
    test_live_camera_reference_diff()
    test_inspection_persistence()
    test_metal_surface_inspection()
    test_object_detection()
    test_datasets_api()
    test_live_continuous_object_and_metal_frame()
    test_bottle_inspection_sample()
    test_pcb_inspection_sample()
    test_textile_inspection_sample()
    test_clean_industrial_baselines()
    print("=" * 55 + "\nALL 15 BACKEND INTEGRATION TESTS PASSED SUCCESSFULLY! ")

