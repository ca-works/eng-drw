"""Capture the real ENG Drawing Viewer windows for the website.

Runs the application from a pinned source snapshot (`git archive <commit> src | tar -x`) with the app's
own venv, on the native macOS (Cocoa) platform at the screen's Retina density. It opens the fictional
sample drawings in `design/drawings/Demo Project` and saves window grabs into `src/assets/screens/`.

    <app>/.venv/bin/python tools/capture/capture.py --snapshot /path/to/snapshot --site .

A window appears on screen for about a minute while the captures run. Nothing is written to the
user's real settings or caches: both are redirected into a temporary folder.
"""
import argparse
import os
from pathlib import Path
import sys
import tempfile
import time


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--snapshot', type=Path, required=True)
    parser.add_argument('--site', type=Path, required=True)
    args = parser.parse_args()
    site = args.site.resolve()
    sys.path.insert(0, str(args.snapshot.resolve() / 'src'))
    os.environ.pop('QT_QPA_PLATFORM', None)
    os.environ.pop('QT_SCALE_FACTOR', None)

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
    flange_c = root / 'Mechanical' / 'Pump Assembly' / 'Revisions' / 'EDV-1001 Bearing flange rev C.pdf'
    out = site / 'src' / 'assets' / 'screens'
    out.mkdir(parents=True, exist_ok=True)

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
    w.resize(1440, 900)
    w.show()
    w.raise_()

    def wait(seconds=1.0):
        until = time.monotonic() + seconds
        while time.monotonic() < until:
            app.processEvents()
            time.sleep(0.01)

    def save(widget, name):
        for mode in ('light', 'dark'):
            tm.set_mode(mode)
            wait(1.2)
            pm = widget.grab()
            pm.save(str(out / f'{name}-{mode}.png'))
            print(f'{name}-{mode}.png', pm.width(), 'x', pm.height(), flush=True)

    w.load_folder(root)
    wait(3)
    w.open_document(str(flange), 0)
    wait(3)
    w.splitter.setSizes([300, 1140])
    w.viewer_split.setSizes([880, 260])
    w.view.fit_page()
    wait(2)
    save(w, 'main')

    # MARK: review callouts with linked comments, plus a circle, an arrow and a highlight.
    w.act_mark.trigger()
    wait(3)
    mark = next(iter(w._mark_windows.values()))
    mark.resize(1440, 900)
    mark.raise_()
    mark.canvas.fit_page()
    wait(2)
    canvas = mark.canvas
    mm = 72 / 25.4
    red = QColor('#E5202A')
    items = [
        EllipseItem(QRectF(126 * mm, 35 * mm, 50 * mm, 50 * mm), red, 1.6),
        ArrowItem(QPointF(345 * mm, 60 * mm), QPointF(309 * mm, 81.5 * mm), red, 1.4),
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
    canvas.set_tool('select')
    wait(1)
    save(mark, 'mark')

    # Queue: the MARKed page plus other drawings, then the main window with the queue visible.
    mark.send_to_queue()
    wait(2)
    canvas.undo_stack.setClean()
    mark.hide()
    for rel in ['Mechanical/Pump Assembly/EDV-1003 Drive shaft.pdf', 'Mechanical/Brackets/EDV-1004 Mounting bracket.pdf']:
        w.open_document(str(root / rel), 0)
        wait(2)
        w.add_current_to_queue()
        wait(1)
    w.open_document(str(flange), 0)
    wait(2)
    w.view.fit_page()
    wait(1.5)
    save(w, 'queue')

    # PDF Tools home and Compare Drawings (rev B against rev C).
    w.set_mode('tools')
    wait(2)
    w.tools.open_tool('')
    wait(1)
    save(w, 'tools')
    w.tools.open_tool('compare')
    wait(1.5)
    from eng_viewer.ui.tools.compare import ComparePanel
    wrap = w.tools.panels['compare']
    panel = wrap if isinstance(wrap, ComparePanel) else wrap.findChild(ComparePanel)
    panel.a.set_path(str(flange.resolve()))
    panel.b.set_path(str(flange_c.resolve()))
    wait(1.5)
    panel.run()
    wait(10)
    save(w, 'compare')

    # Edit PDF (2.3.0): the flange with a box and a revision note added as real PDF content.
    import pymupdf
    page_w, page_h = pymupdf.open(str(flange))[0].rect[2:]
    w.set_mode('pdf_edit')
    wait(2)
    pdf = w.pdf_editor
    pdf.open_file(str(flange))
    wait(4)
    red = [.84, .11, .16]
    pdf._add({'kind': 'rectangle', 'page': 0, 'rect': [page_w * .60, page_h * .10, page_w * .80, page_h * .32],
              'color': red, 'width': 2.0, 'fill': None, 'text': '', 'font': 'helv', 'size': 12})
    wait(5)
    pdf._add({'kind': 'text', 'page': 0, 'rect': [page_w * .60, page_h * .33, page_w * .90, page_h * .38],
              'text': 'REV C: hub chamfer 1.5 x 45 deg', 'font': 'helv', 'size': 14, 'color': red})
    wait(5)
    pdf.fit_page()
    wait(2)
    save(w, 'pdfedit')

    # Image Editor (2.3.0): the site's sample photo after "Remove background automatically".
    demo = site / 'public' / 'demo'
    w.set_mode('image')
    wait(2)
    img = w.image_editor
    img.open_file(str(demo / 'sample.jpg'))
    wait(4)
    img.remove_background()
    wait(6)
    img.set_tool('quick')
    wait(1)
    save(w, 'image')

    # Vector Editor (2.3.0): the rotor outline the app traced (tools/demo/make_demo_assets.py),
    # selected with the node tool so its editable points show.
    w.set_mode('vector')
    wait(2)
    vec = w.vector_editor
    vec.open_file(str(demo / 'trace.svg'))
    wait(3)
    for item in vec.items.values():
        item.setSelected(True)
    vec.set_tool('nodes')
    wait(2)
    save(w, 'vector')

    render.shutdown()
    print('Captured native windows into', out)
    os._exit(0)


if __name__ == '__main__':
    main()
