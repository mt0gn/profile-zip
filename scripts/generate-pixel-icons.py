from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DESKTOP = Path("C:/Users/bomin/OneDrive/바탕 화면")
GRID_X = 72
GRID_Y = 115
CELL = 12
SIZE = 32

FILES = {
    "folder": "01-folder-edit-grid.png",
    "file": "02-document-edit-grid.png",
    "imageapp": "03-image-edit-grid.png",
    "videoapp": "04-video-edit-grid.png",
    "camera": "05-camera-edit-grid.png",
    "notification": "06-mail-edit-grid.png",
    "chat": "07-chat-edit-grid.png",
    "appmusic": "08-music-edit-grid.png",
    "paint": "09-paint-edit-grid.png",
    "internet": "11-internet-edit-grid.png",
    "trash": "12-trash-edit-grid.png",
    "memory": "１３-ｍｅｍｏｒｙ-edit-grid.png",
}

CHECKER = {(224, 224, 218), (201, 207, 204)}
PAPER = (244, 240, 230)
ROLE_BY_COLOR = {
    PAPER: "paper",
    (156, 181, 175): "main",
    (48, 68, 63): "outline",
    (214, 197, 124): "point",
    (111, 142, 135): "shadow",
}
ROLE_ORDER = ("shadow", "outline", "paper", "main", "point")


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


def edge_background(cells: list[list[tuple[int, int, int]]]) -> set[tuple[int, int]]:
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
        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < SIZE and 0 <= ny < SIZE:
                queue.append((nx, ny))
    return seen


def role_grid(name: str, filename: str) -> list[list[str | None]]:
    cells = sample_grid(DESKTOP / filename)
    transparent = {
        (x, y)
        for y, row in enumerate(cells)
        for x, color in enumerate(row)
        if color in CHECKER
    }
    if name == "trash":
        transparent |= edge_background(cells)
    result: list[list[str | None]] = []
    for y, row in enumerate(cells):
        result_row: list[str | None] = []
        for x, color in enumerate(row):
            if (x, y) in transparent:
                result_row.append(None)
                continue
            if color not in ROLE_BY_COLOR:
                raise ValueError(f"Unexpected color {color} in {filename} at ({x}, {y})")
            result_row.append(ROLE_BY_COLOR[color])
        result.append(result_row)
    return result


def role_path(grid: list[list[str | None]], role: str) -> str:
    commands: list[str] = []
    for y, row in enumerate(grid):
        x = 0
        while x < SIZE:
            if row[x] != role:
                x += 1
                continue
            start = x
            while x < SIZE and row[x] == role:
                x += 1
            width = x - start
            commands.append(f"M{start} {y}h{width}v1H{start}z")
    return "".join(commands)


def main() -> None:
    lines = [
        "/* Generated from the user-approved 32×32 correction grids. */",
        "window.PROFILE_ZIP_PIXEL_ICONS = Object.freeze({",
    ]
    for name, filename in FILES.items():
        grid = role_grid(name, filename)
        lines.append(f'  "{name}": Object.freeze({{')
        for role in ROLE_ORDER:
            path = role_path(grid, role)
            if path:
                lines.append(f'    "{role}": "{path}",')
        lines.append("  }),")
    lines.extend(["});", ""])
    output = PROJECT_ROOT / "pixel-icons.js"
    output.write_text("\n".join(lines), encoding="utf-8")
    print(output)


if __name__ == "__main__":
    main()
