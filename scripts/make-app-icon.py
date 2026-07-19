from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parent.parent
SOURCE_PATH = PROJECT_ROOT / "desktop" / "LeanMD" / "Assets" / "LeanMD.png"
OUTPUT_PATH = PROJECT_ROOT / "desktop" / "LeanMD" / "Assets" / "LeanMD.ico"
ICON_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


with Image.open(SOURCE_PATH) as source:
    icon = source.convert("RGBA")
    if icon.width != icon.height:
        raise ValueError("The LeanMD icon source must be square.")

    icon.save(OUTPUT_PATH, format="ICO", sizes=ICON_SIZES)

with Image.open(OUTPUT_PATH) as generated:
    generated_sizes = sorted(generated.ico.sizes())

if generated_sizes != ICON_SIZES:
    raise ValueError(f"Unexpected ICO sizes: {generated_sizes}")

print(f"Created {OUTPUT_PATH} with icon sizes: {generated_sizes}")
