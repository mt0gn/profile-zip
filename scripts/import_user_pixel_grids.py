from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


DESKTOP = Path("C:/Users/bomin/OneDrive/바탕 화면")
OUTPUT_ROOT = Path(
    "C:/Users/bomin/.codex/visualizations/2026/08/12/"
    "019ff491-00de-7983-95da-23319ec84ec4"
)

FILES = [
    ("01-folder", "01-folder-edit-grid.png"),
    ("02-document", "02-document-edit-grid.png"),
    ("03-image", "03-image-edit-grid.png"),
    ("04-video", "04-video-edit-grid.png"),
    ("05-camera", "05-camera-edit-grid.png"),
    ("06-mail", "06-mail-edit-grid.png"),
    ("07-chat", "07-chat-edit-grid.png"),
    ("08-music", "08-music-edit-grid.png"),
    ("09-paint", "09-paint-edit-grid.png"),
    ("10-settings", "10-settings-edit-grid.png"),
    ("11-internet", "11-internet-edit-grid.png"),
    ("12-trash", "12-trash-edit-grid.png"),
    ("13-memory", "１３-ｍｅｍｏｒｙ-edit-grid.png"),
]

GRID_X = 72
GRID_Y = 115
CELL = 12
SIZE = 32

CHECKER = {(224, 224, 218), (201, 207, 204)}
PAPER = (244, 240, 230)
PALETTE = {
    (156, 181, 175): "main",
    (48, 68, 63): "outline",
    (214, 197, 124): "point",
    (111, 142, 135): "shadow",
    PAPER: "paper",
}


def sample_grid(path: Path) -> list[list[tuple[int, int, int]]]:
    source = Image.open(path).convert("RGB")
    return [
        [
            source.getpixel(
                (GRID_X + CELL * x + CELL // 2, GRID_Y + CELL * y + CELL // 2)
            )
            for x in range(SIZE)
        ]
        for y in range(SIZE)
    ]


def transparent_background(
    cells: list[list[tuple[int, int, int]]], *, cream_is_grid: bool
) -> set[tuple[int, int]]:
    transparent = {
        (x, y)
        for y, row in enumerate(cells)
        for x, color in enumerate(row)
        if color in CHECKER
    }
    if not cream_is_grid:
        return transparent

    # The trash correction was drawn on the older cream grid. Only cream cells
    # connected to an outer edge are background; enclosed cream stays in the icon.
    queue: deque[tuple[int, int]] = deque()
    for x in range(SIZE):
        queue.extend(((x, 0), (x, SIZE - 1)))
    for y in range(SIZE):
        queue.extend(((0, y), (SIZE - 1, y)))

    seen: set[tuple[int, int]] = set()
    while queue:
        x, y = queue.popleft()
        if (x, y) in seen or cells[y][x] != PAPER:
            continue
        seen.add((x, y))
        transparent.add((x, y))
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < SIZE and 0 <= ny < SIZE:
                queue.append((nx, ny))
    return transparent


def render_icon(
    cells: list[list[tuple[int, int, int]]], *, cream_is_grid: bool
) -> Image.Image:
    transparent = transparent_background(cells, cream_is_grid=cream_is_grid)
    icon = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    for y, row in enumerate(cells):
        for x, color in enumerate(row):
            if (x, y) in transparent:
                continue
            if color not in PALETTE:
                raise ValueError(f"Unexpected cell color {color} at ({x}, {y})")
            icon.putpixel((x, y), (*color, 255))
    return icon


def checker_tile(width: int, height: int, tile: int = 8) -> Image.Image:
    image = Image.new("RGBA", (width, height), (244, 240, 230, 255))
    draw = ImageDraw.Draw(image)
    alternate = (224, 224, 218, 255)
    for y in range(0, height, tile):
        for x in range(0, width, tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill=alternate)
    return image


def load_font(size: int, *, bold: bool = False) -> ImageFont.FreeTypeFont:
    filename = "malgunbd.ttf" if bold else "malgun.ttf"
    return ImageFont.truetype(str(Path("C:/Windows/Fonts") / filename), size)


def main() -> None:
    out32 = OUTPUT_ROOT / "user-corrected-pixel-icons-32"
    out64 = OUTPUT_ROOT / "user-corrected-pixel-icons-64"
    out32.mkdir(parents=True, exist_ok=True)
    out64.mkdir(parents=True, exist_ok=True)

    icons: list[tuple[str, Image.Image]] = []
    for name, filename in FILES:
        cells = sample_grid(DESKTOP / filename)
        icon = render_icon(cells, cream_is_grid=name == "12-trash")
        icon.save(out32 / f"{name}.png")
        icon.resize((64, 64), Image.Resampling.NEAREST).save(out64 / f"{name}.png")
        icons.append((name, icon))

    card_w, card_h = 188, 150
    columns = 4
    rows = (len(icons) + columns - 1) // columns
    margin = 24
    header_h = 94
    sheet = Image.new(
        "RGBA",
        (margin * 2 + card_w * columns, header_h + margin + card_h * rows),
        (244, 240, 230, 255),
    )
    draw = ImageDraw.Draw(sheet)
    title_font = load_font(26, bold=True)
    label_font = load_font(15, bold=True)
    meta_font = load_font(12)
    draw.text((margin, 20), "사용자 수정 픽셀 아이콘 · 32×32", fill=(48, 68, 63), font=title_font)
    draw.text(
        (margin, 56),
        "원본 셀을 그대로 복원 · 아래 표시는 3배 확대",
        fill=(78, 92, 88),
        font=meta_font,
    )

    for index, (name, icon) in enumerate(icons):
        col = index % columns
        row = index // columns
        x = margin + col * card_w
        y = header_h + row * card_h
        draw.rounded_rectangle(
            (x + 5, y + 5, x + card_w - 10, y + card_h - 10),
            radius=14,
            fill=(255, 255, 255, 255),
            outline=(48, 68, 63, 255),
            width=2,
        )
        preview = checker_tile(104, 104)
        scaled = icon.resize((96, 96), Image.Resampling.NEAREST)
        preview.alpha_composite(scaled, (4, 4))
        sheet.alpha_composite(preview, (x + 12, y + 14))
        draw.text((x + 124, y + 36), name.split("-", 1)[0], fill=(48, 68, 63), font=label_font)
        draw.text(
            (x + 124, y + 62),
            name.split("-", 1)[1],
            fill=(48, 68, 63),
            font=meta_font,
        )

    overview = OUTPUT_ROOT / "user-corrected-pixel-icons-overview.png"
    sheet.convert("RGB").save(overview, quality=95)
    print(overview)


if __name__ == "__main__":
    main()
