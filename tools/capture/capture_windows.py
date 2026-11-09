"""Capture the real ENG Drawing Viewer MARK window on Windows for the website.

Runs the application from source with the Windows build environment (native Windows platform, real
title bar) and opens the fictional sample drawing in `design/drawings/Demo Project`. Saves grabs of
the on-screen window, light and dark, into `src/assets/screens/windows-{light,dark}.png`.

    <app>\\.venv-build\\Scripts\\python.exe tools\\capture\\capture_windows.py --app <app> --site .

A window appears on screen for about half a minute: leave it alone while it runs. Settings and
caches are redirected into a temporary folder.
"""
import argparse
import ctypes
from ctypes import wintypes
import os
from pathlib import Path
import sys
import tempfile
import time


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--app', type=Path, required=True)
    parser.add_argument('--site', type=Path, required=True)
    args = parser.parse_args()
    site = args.site.resolve()
    sys.path.insert(0, str(args.app.resolve() / 'src'))
    os.environ.pop('QT_QPA_PLATFORM', None)

    from PIL import ImageGrab
    from PySide6.QtCore import QPointF, QRectF
    from PySide6.QtGui import QColor, QPixmap
    from PySide6.QtWidgets import QApplication
    import eng_viewer.core.config as config
    import eng_viewer.ui.thumbnails as thumbnails
    from eng_viewer.core.config import Settings
    from eng_viewer.core.render_service import RenderService
    from eng_viewer.ui.main_window import MainWindow
    from eng_viewer.ui.mark.commands import AddItems
    from eng_viewer.ui.mark.items import ArrowItem, BubbleItem, EllipseItem, StrokeItem
    from eng_viewer.ui.theme import ThemeManager

    work = Path(tempfile.mkdtemp(prefix='eng-site-capture-'))
    os.chdir(site / 'design' / 'drawings')
    root = Path('Demo Project')
    flange = root / 'Mechanical' / 'Pump Assembly' / 'EDV-1001 Bearing flange rev B.pdf'
    out = site / 'src' / 'assets' / 'screens'

    app = QApplication.instance() or QApplication([])
    app.setApplicationName('ENG Drawing Viewer')
    config.cache_dir = lambda: work
    thumbnails.cache_dir = lambda: work
    settings = Settings(work / 'settings.json')
    settings.set('recent_folders', [])
    settings.set('thumbnail_disk_cache', False)
    tm = ThemeManager(app, 'light')
    tm.apply()
    render = RenderService(max_workers=3)
    w = MainWindow(settings, render, QPixmap())

    def wait(seconds=1.0):
        until = time.monotonic() + seconds
        while time.monotonic() < until:
            app.processEvents()
            time.sleep(0.01)

    w.resize(1280, 800)
    w.show()
    wait(1)
    w.load_folder(root)
    wait(3)
    w.open_document(str(flange), 0)
    wait(3)
    w.act_mark.trigger()
    wait(3)
    mark = next(iter(w._mark_windows.values()))
    w.hide()
    avail = app.primaryScreen().availableGeometry()
    mark.resize(min(1440, avail.width() - 60), min(900, avail.height() - 60))
    mark.move(avail.left() + 30, avail.top() + 20)
    mark.show()
    mark.raise_()
    mark.activateWindow()
    mark.canvas.fit_page()
    wait(2)
    canvas = mark.canvas
    mm = 72 / 25.4
    red = QColor('#E5202A')
    items = [
        EllipseItem(QRectF(126 * mm, 35 * mm, 50 * mm, 50 * mm), red, 1.6),
        ArrowItem(QPointF(345 * mm, 60 * mm), QPointF(309 * mm, 81.5 * mm), red, 1.4),
        EllipseItem(QRectF(245 * mm, 150 * mm, 70 * mm, 38 * mm), red, 1.6),
    ]
    hl = StrokeItem(QColor('#FFD21E'), 16, highlighter=True, opacity=0.42)
    for x in range(262, 304, 2):
        hl.add_point(QPointF(x * mm, 216 * mm))
    items.append(hl)
    canvas.undo_stack.push(AddItems(canvas, items, 'Add marks'))
    comments = [
        ((182, 38), 'Confirm the 6× Ø14 pattern against the pump cover.'),
        ((139, 101), 'Keyway width needs a tolerance (18 JS9).'),
        ((300, 230), 'Check flange thickness against the bolt grip length.'),
        ((352, 50), 'Hub chamfer 1.5 × 45°: confirm with the bearing supplier.'),
    ]
    for i, ((x, y), text) in enumerate(comments, 1):
        bubble = BubbleItem(i, 30, True, canvas.font().family())
        bubble.setPos(QPointF(x * mm, y * mm))
        canvas.undo_stack.push(AddItems(canvas, [bubble], f'Add callout {i}'))
        wait(0.1)
        mark.comments.rows[id(bubble)].edit.setPlainText(text)
    # Select the lower ellipse so its resize handles show.
    canvas.set_tool('select')
    wait(0.5)
    items[2].setSelected(True)
    wait(1)

    def window_rect(widget):
        rect = wintypes.RECT()
        hwnd = int(widget.winId())
        ctypes.windll.dwmapi.DwmGetWindowAttribute(wintypes.HWND(hwnd), 9, ctypes.byref(rect), ctypes.sizeof(rect))
        return rect.left, rect.top, rect.right, rect.bottom

    for mode in ('light', 'dark'):
        tm.set_mode(mode)
        mark.raise_()
        mark.activateWindow()
        wait(2)
        img = ImageGrab.grab(bbox=window_rect(mark), all_screens=True)
        img.save(out / f'windows-{mode}.png')
        print(f'windows-{mode}.png', img.size, flush=True)
    render.shutdown()
    os._exit(0)


if __name__ == '__main__':
    main()
