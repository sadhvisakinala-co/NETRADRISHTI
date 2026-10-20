"""
Generate genuine high-quality raster PNG dataset samples using OpenCV and NumPy.
These serve as the built-in reference and defect samples for NETRADRISHTI.
"""

import cv2
import numpy as np
import os

OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "public", "samples")
os.makedirs(OUT_DIR, exist_ok=True)

def create_bottle_pair():
    # 512x512 canvas with dark industrial inspection stage background
    w, h = 512, 512
    bg = np.full((h, w, 3), 32, dtype=np.uint8)
    # Add subtle gradient/vignette
    for y in range(h):
        for x in range(w):
            dist = np.sqrt((x - 256)**2 + (y - 256)**2)
            shade = max(20, int(35 - (dist / 360) * 15))
            bg[y, x] = [shade, shade + 2, shade]

    # Draw emerald glass bottle
    ref = bg.copy()
    pts = np.array([
        [220, 50], [292, 50], [292, 110], [340, 180], [340, 470],
        [172, 470], [172, 180], [220, 110]
    ], np.int32)
    cv2.fillPoly(ref, [pts], (42, 85, 55)) # BGR: deep forest green
    cv2.polylines(ref, [pts], True, (75, 140, 95), 2, cv2.LINE_AA)

    # Brass neck ring and label
    cv2.rectangle(ref, (210, 35), (302, 60), (60, 140, 180), -1) # Brass/amber
    cv2.rectangle(ref, (185, 230), (327, 340), (210, 225, 220), -1) # Ivory label
    cv2.rectangle(ref, (185, 230), (327, 340), (70, 150, 190), 2)
    cv2.putText(ref, "NETRA RESERVE", (200, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (30, 45, 35), 2, cv2.LINE_AA)
    cv2.putText(ref, "BATCH LOT #8402", (205, 310), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (80, 85, 80), 1, cv2.LINE_AA)

    # Defect version has a fracture crack and surface bubble
    defect = ref.copy()
    # Stress fracture line
    cv2.line(defect, (230, 380), (285, 435), (20, 30, 190), 3, cv2.LINE_AA)
    cv2.line(defect, (285, 435), (310, 445), (20, 30, 190), 2, cv2.LINE_AA)
    # Glass inclusion bubble
    cv2.circle(defect, (275, 415), 8, (15, 20, 180), -1, cv2.LINE_AA)

    cv2.imwrite(os.path.join(OUT_DIR, "bottle_golden_ref.png"), ref)
    cv2.imwrite(os.path.join(OUT_DIR, "bottle_surface_defect.png"), defect)
    print("Saved bottle pair")

def create_metal_pair():
    w, h = 512, 512
    ref = np.full((h, w, 3), 36, dtype=np.uint8)
    # Machined steel plate
    cv2.rectangle(ref, (60, 60), (452, 452), (105, 115, 125), -1)
    cv2.rectangle(ref, (60, 60), (452, 452), (150, 160, 170), 3)

    # Concentric machined rings
    center = (256, 256)
    cv2.circle(ref, center, 150, (120, 130, 140), 2, cv2.LINE_AA)
    cv2.circle(ref, center, 100, (135, 145, 155), 2, cv2.LINE_AA)
    cv2.circle(ref, center, 50, (60, 65, 70), -1, cv2.LINE_AA)
    cv2.circle(ref, center, 20, (20, 22, 25), -1, cv2.LINE_AA)

    # Bore bolt holes
    for pos in [(100, 100), (412, 100), (100, 412), (412, 412)]:
        cv2.circle(ref, pos, 18, (25, 28, 30), -1)
        cv2.circle(ref, pos, 18, (140, 150, 160), 2)

    defect = ref.copy()
    # High-contrast surface gouge / fracture
    cv2.line(defect, (180, 160), (240, 215), (25, 30, 195), 4, cv2.LINE_AA)
    cv2.line(defect, (240, 215), (220, 245), (25, 30, 195), 3, cv2.LINE_AA)
    cv2.circle(defect, (315, 330), 16, (20, 25, 190), -1) # Surface pit

    cv2.imwrite(os.path.join(OUT_DIR, "metal_golden_ref.png"), ref)
    cv2.imwrite(os.path.join(OUT_DIR, "metal_surface_defect.png"), defect)
    print("Saved metal pair")

def create_pcb_pair():
    w, h = 512, 512
    # FR4 green solder mask
    ref = np.full((h, w, 3), (25, 60, 20), dtype=np.uint8)
    cv2.rectangle(ref, (40, 40), (472, 472), (35, 95, 30), -1)
    cv2.rectangle(ref, (40, 40), (472, 472), (50, 130, 45), 2)

    # SMT microcontroller in center
    cv2.rectangle(ref, (190, 190), (322, 322), (30, 30, 30), -1)
    cv2.rectangle(ref, (190, 190), (322, 322), (70, 70, 70), 2)
    cv2.putText(ref, "STM32", (220, 265), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (50, 180, 210), 2, cv2.LINE_AA)

    # Copper trace runs
    gold_color = (40, 175, 215)
    for y_offset in range(70, 180, 30):
        cv2.line(ref, (60, y_offset), (180, y_offset), gold_color, 3, cv2.LINE_AA)
    for y_offset in range(340, 450, 30):
        cv2.line(ref, (330, y_offset), (450, y_offset), gold_color, 3, cv2.LINE_AA)

    defect = ref.copy()
    # Solder bridge defect shorting two traces
    cv2.rectangle(defect, (130, 95), (150, 135), (20, 20, 200), -1) # solder blob
    # Scorched copper trace defect
    cv2.circle(defect, (390, 370), 15, (10, 10, 190), -1)

    cv2.imwrite(os.path.join(OUT_DIR, "pcb_golden_ref.png"), ref)
    cv2.imwrite(os.path.join(OUT_DIR, "pcb_surface_defect.png"), defect)
    print("Saved pcb pair")

def create_textile_pair():
    w, h = 512, 512
    ref = np.full((h, w, 3), (55, 50, 60), dtype=np.uint8)
    # Crosshatch fabric weave
    for i in range(0, 512, 16):
        cv2.line(ref, (0, i), (512, i), (75, 70, 80), 1)
        cv2.line(ref, (i, 0), (i, 512), (75, 70, 80), 1)

    defect = ref.copy()
    # Snagged thread / dark oil stain
    cv2.ellipse(defect, (256, 256), (45, 25), 30, 0, 360, (20, 20, 190), -1)
    cv2.line(defect, (160, 180), (220, 220), (20, 25, 200), 4, cv2.LINE_AA)

    cv2.imwrite(os.path.join(OUT_DIR, "textile_golden_ref.png"), ref)
    cv2.imwrite(os.path.join(OUT_DIR, "textile_surface_defect.png"), defect)
    print("Saved textile pair")

if __name__ == "__main__":
    create_bottle_pair()
    create_metal_pair()
    create_pcb_pair()
    create_textile_pair()
    print("All genuine raster samples created successfully in public/samples/")
