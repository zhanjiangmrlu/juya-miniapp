#!/usr/bin/env python3
"""保留交付原图，生成可复现的外置背景；使用已有 Pillow，不安装依赖"""

import argparse
import hashlib
import io
import json
import re
from pathlib import Path

from PIL import Image, __version__, features

DIRECTORY = Path(__file__).resolve().parents[1] / "resources/oss/backgrounds"
QUALITY = 82


def generate(check: bool) -> None:
    """生成背景并核验预算；check 表示仅核验当前文件、不写入产物"""
    manifest_path = DIRECTORY / "manifest.json"
    manifest = json.loads(manifest_path.read_text())
    outputs = {}
    for asset in manifest["assets"]:
        source = DIRECTORY / asset["file"]
        original = source.read_bytes()
        if hashlib.sha256(original).hexdigest() != asset["sha256"]:
            raise ValueError(f"Original SHA mismatch: {source.name}")
        with Image.open(source) as image:
            if list(image.size) != asset["dimensions"] or image.size != (853, 1844):
                raise ValueError(f"Original dimensions mismatch: {source.name}")
            paper = source.stem == "paper-texture"
            encoded = io.BytesIO()
            image.convert("RGB").save(
                encoded,
                format="JPEG" if paper else "WEBP",
                quality=QUALITY,
                **({"optimize": True} if paper else {"method": 6}),
            )
        payload = encoded.getvalue()
        digest = hashlib.sha256(payload).hexdigest()
        filename = f"{source.stem}-{digest[:12]}.{'jpg' if paper else 'webp'}"
        if len(payload) > 100 * 1024:
            raise ValueError(f"Variant exceeds 100KB: {filename}")
        asset["variant"] = {
            "file": filename,
            "format": "JPEG" if paper else "WebP",
            "quality": QUALITY,
            "dimensions": asset["dimensions"],
            "bytes": len(payload),
            "sha256": digest,
        }
        outputs[filename] = payload
    paper_bytes = next(
        asset["variant"]["bytes"]
        for asset in manifest["assets"]
        if asset["file"] == "paper-texture.png"
    )
    for asset in manifest["assets"]:
        if asset["variant"]["bytes"] + paper_bytes > 160 * 1024:
            raise ValueError(f"Page exceeds 160KB: {asset['file']}")
    manifest["compression"] = {
        "pillow": __version__,
        "libwebp": features.version("webp"),
        "libjpeg": features.version("jpg"),
        "webp_method": 6,
        "jpeg_optimize": True,
        "resize": False,
        "command": "python scripts/compress-page-backgrounds.py",
    }
    # 清单最后写入，原始 PNG 始终只读；未匹配文件不自动删除
    manifest_text = re.sub(
        r"\[\n\s+(\d+),\n\s+(\d+)\n\s+\]",
        r"[\1, \2]",
        json.dumps(manifest, ensure_ascii=False, indent=2),
    )
    outputs["manifest.json"] = (manifest_text + "\n").encode()
    for filename, payload in outputs.items():
        target = DIRECTORY / filename
        if check:
            if not target.exists() or target.read_bytes() != payload:
                raise ValueError(f"Generated asset out of date: {filename}")
        else:
            target.write_bytes(payload)
        print(f"{filename}: {len(payload)} bytes")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify without writing files")
    generate(parser.parse_args().check)
