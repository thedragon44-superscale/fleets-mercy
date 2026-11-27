#!/usr/bin/env python3
"""
Batch-optimize unit sprite PNGs in src/assets/ into centered, power-of-two
square RGBA textures (256x256 for 1W-2W, 512x512 for 3W-5W/Boss) with 10%
uniform transparent padding so WebGL mipmapping works cleanly without clipping
rotated corners or squashing aspect ratios.

Untouched originals are backed up to assets_masters/ at the repo root first.
Non-unit UI assets (e.g. dragon_logo.png) are intentionally skipped.
"""

from pathlib import Path
import shutil
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
SRC_ASSETS_DIR = REPO_ROOT / "src" / "assets"
MASTERS_DIR = REPO_ROOT / "assets_masters"

# Exact target power-of-two dimensions per unit sprite (by weight class)
UNIT_TARGET_SIZES: dict[str, int] = {
    # 1W - 2W units -> 256x256
    "viper.png": 256,
    "recon.png": 256,
    "phantom.png": 256,
    "ion.png": 256,
    "mining.png": 256,
    "supply.png": 256,
    "plasma.png": 256,
    "grav.png": 256,
    # 3W - 5W units & Bosses -> 512x512
    "assault.png": 512,
    "aegis.png": 512,
    "vortex.png": 512,
    "lancer.png": 512,
    "cryo.png": 512,
    "specter.png": 512,
    "flagship.png": 512,
    "wall.png": 512,
    "torpedo.png": 512,
    "warp.png": 512,
    "turret.png": 512,
}

PADDING_RATIO = 0.10  # 10% uniform transparent margin on all 4 sides


def optimize_sprite(src_path: Path, dst_path: Path, target_size: int) -> tuple[int, int]:
    """Trim transparent margins, fit proportionally with 10% padding, write RGBA square."""
    with Image.open(src_path) as im:
        rgba = im.convert("RGBA")
        bbox = rgba.getbbox()
        if bbox is None:
            raise ValueError(f"{src_path.name} is completely transparent")

        trimmed = rgba.crop(bbox)
        tw, th = trimmed.size

        # Fit trimmed ship inside the inner 80% box (10% padding per side)
        inner_max = int(round(target_size * (1.0 - 2.0 * PADDING_RATIO)))
        scale = min(inner_max / tw, inner_max / th)
        new_w = max(1, int(round(tw * scale)))
        new_h = max(1, int(round(th * scale)))

        resized = trimmed.resize((new_w, new_h), Image.Resampling.LANCZOS)

        canvas = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
        paste_x = (target_size - new_w) // 2
        paste_y = (target_size - new_h) // 2
        canvas.paste(resized, (paste_x, paste_y), resized)

        canvas.save(dst_path, format="PNG", optimize=True)
        return new_w, new_h


def main() -> None:
    MASTERS_DIR.mkdir(parents=True, exist_ok=True)

    total_before = 0
    total_after = 0

    for filename, target_size in sorted(UNIT_TARGET_SIZES.items()):
        asset_path = SRC_ASSETS_DIR / filename
        master_path = MASTERS_DIR / filename

        if not asset_path.exists():
            print(f"[SKIP] Missing {asset_path}")
            continue

        # Back up original untouched master only if not already backed up
        if not master_path.exists():
            shutil.copy2(asset_path, master_path)
            print(f"[BACKUP] {asset_path.name} -> assets_masters/{master_path.name}")

        before_bytes = master_path.stat().st_size
        total_before += before_bytes

        # Always process from the pristine master so re-runs are lossless & idempotent
        fit_w, fit_h = optimize_sprite(master_path, asset_path, target_size)
        after_bytes = asset_path.stat().st_size
        total_after += after_bytes

        pct = (1.0 - after_bytes / before_bytes) * 100.0 if before_bytes > 0 else 0.0
        print(
            f"[OK] {filename:14s} -> {target_size}x{target_size} "
            f"(fit {fit_w}x{fit_h}) | {before_bytes/1024:7.1f} KB -> {after_bytes/1024:6.1f} KB (-{pct:4.1f}%)"
        )

    saved_pct = (1.0 - total_after / total_before) * 100.0 if total_before > 0 else 0.0
    print(
        f"\nTotal unit PNGs: {total_before/1024/1024:.2f} MB -> "
        f"{total_after/1024/1024:.2f} MB (-{saved_pct:.1f}%)"
    )


if __name__ == "__main__":
    main()
