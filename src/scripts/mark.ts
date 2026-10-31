type Tool =
  | 'select'
  | 'pen'
  | 'highlighter'
  | 'arrow'
  | 'circle'
  | 'text'
  | 'bubble'
  | 'eraser';
interface Annotation {
  id: number;
  tool: Tool;
  x: number;
  y: number;
  endX: number;
  endY: number;
  color: string;
  size: number;
  points: string;
  comment: string;
  number?: number;
}
const host = document.querySelector<HTMLElement>('[data-mark]');
if (host) {
  const svg = host.querySelector<SVGSVGElement>('.mark-sheet svg')!;
  const layer = svg.querySelector<SVGGElement>('[data-annotations]')!;
  const sheet = host.querySelector<HTMLElement>('.mark-sheet')!;
  const comments = host.querySelector<HTMLOListElement>('[data-comments]')!;
  const color = host.querySelector<HTMLInputElement>('input[type=color]')!;
  const size = host.querySelector<HTMLInputElement>('input[type=range]')!;
  let tool: Tool = 'bubble',
    items: Annotation[] = [],
    past: Annotation[][] = [],
    future: Annotation[][] = [],
    nextId = 1,
    active: Annotation | null = null,
    start = { x: 0, y: 0 },
    before: Annotation[] = [];
  const clone = () => structuredClone(items);
  const status = (s: string) => {
    host.querySelector('[data-mark-status]')!.textContent = s;
  };
  const point = (e: PointerEvent) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      svg.getScreenCTM()!.inverse(),
    );
    return {
      x: Math.max(36, Math.min(784, p.x)),
      y: Math.max(36, Math.min(504, p.y)),
    };
  };
  function remember(previous: Annotation[]) {
    past.push(previous);
    if (past.length > 60) past.shift();
    future = [];
  }
  function setTool(t: Tool) {
    tool = t;
    host!
      .querySelectorAll<HTMLButtonElement>('[data-tool]')
      .forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.tool === t)),
      );
    sheet.style.cursor = t === 'select' ? 'grab' : 'crosshair';
    status(`${t} selected`);
  }
  function node(name: string, attrs: Record<string, string | number>) {
    const n = document.createElementNS('http://www.w3.org/2000/svg', name);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    return n;
  }
  function renderDrawing() {
    layer.replaceChildren();
    for (const a of items) {
      let el: SVGElement;
      const attrs = {
        stroke: a.color,
        'stroke-width': a.size / 5,
        fill: 'none',
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      };
      if (a.tool === 'bubble') {
        el = node('g', {
          'data-id': a.id,
          tabindex: 0,
          role: 'button',
          'aria-label': `Callout ${a.number}: ${a.comment || 'Add a comment'}`,
        });
        el.append(
          node('circle', {
            cx: a.x,
            cy: a.y,
            r: Math.max(13, a.size),
            fill: '#fff',
            stroke: '#e81a1e',
            'stroke-width': Math.max(13, a.size) * 0.15,
          }),
        );
        const text = node('text', {
          x: a.x,
          y: a.y + 1,
          'text-anchor': 'middle',
          'dominant-baseline': 'middle',
          fill: '#000',
          'font-size': Math.max(13, a.size),
          'font-weight': 700,
          'font-family': 'sans-serif',
        });
        text.textContent = String(a.number);
        el.append(text);
      } else if (a.tool === 'circle') {
        el = node('ellipse', {
          ...attrs,
          cx: (a.x + a.endX) / 2,
          cy: (a.y + a.endY) / 2,
          rx: Math.max(2, Math.abs(a.endX - a.x) / 2),
          ry: Math.max(2, Math.abs(a.endY - a.y) / 2),
        });
      } else if (a.tool === 'arrow') {
        const angle = Math.atan2(a.endY - a.y, a.endX - a.x),
          r = 12;
        el = node('path', {
          ...attrs,
          d: `M${a.x} ${a.y}L${a.endX} ${a.endY}M${a.endX - r * Math.cos(angle - 0.45)} ${a.endY - r * Math.sin(angle - 0.45)}L${a.endX} ${a.endY}L${a.endX - r * Math.cos(angle + 0.45)} ${a.endY - r * Math.sin(angle + 0.45)}`,
        });
      } else if (a.tool === 'text') {
        el = node('text', {
          x: a.x,
          y: a.y,
          fill: a.color,
          'font-size': a.size,
          'font-family': 'sans-serif',
        });
        el.textContent = a.comment || 'Review detail';
      } else {
        el = node('polyline', {
          ...attrs,
          points: a.points,
          'stroke-width': a.tool === 'highlighter' ? a.size : a.size / 5,
          opacity: a.tool === 'highlighter' ? 0.35 : 1,
        });
      }
      el.dataset.id = String(a.id);
      layer.append(el);
    }
    host!.querySelector<HTMLButtonElement>('[data-undo]')!.disabled =
      !past.length;
    host!.querySelector<HTMLButtonElement>('[data-redo]')!.disabled =
      !future.length;
    host!.querySelector<HTMLElement>('[data-empty]')!.hidden = items.some(
      (a) => a.tool === 'bubble' || a.tool === 'text',
    );
  }
  function renderComments() {
    const focusId = (document.activeElement as HTMLElement)?.dataset.commentId;
    const selection = (document.activeElement as HTMLTextAreaElement)
      ?.selectionStart;
    comments.replaceChildren();
    for (const a of items.filter(
      (a) => a.tool === 'bubble' || a.tool === 'text',
    )) {
      const li = document.createElement('li');
      const b = document.createElement('button');
      b.textContent = String(a.number || 'T');
      b.setAttribute(
        'aria-label',
        `Highlight ${a.number ? 'callout ' + a.number : 'text annotation'}`,
      );
      b.addEventListener('click', () => {
        layer.querySelector<SVGElement>(`[data-id="${a.id}"]`)?.focus();
        const el = layer.querySelector(`[data-id="${a.id}"]`);
        el?.setAttribute('opacity', '.45');
        setTimeout(() => el?.removeAttribute('opacity'), 250);
      });
      const input = document.createElement('textarea');
      input.value = a.comment;
      input.placeholder =
        a.tool === 'text' ? 'Text on drawing' : 'Add a review comment…';
      input.setAttribute(
        'aria-label',
        a.tool === 'text' ? 'Text annotation' : `Comment ${a.number}`,
      );
      input.dataset.commentId = String(a.id);
      let old: Annotation[] | null = null;
      input.addEventListener('focus', () => {
        old = clone();
      });
      input.addEventListener('input', () => {
        a.comment = input.value;
        if (a.tool === 'text') renderDrawing();
      });
      input.addEventListener('change', () => {
        if (old) remember(old);
        renderDrawing();
      });
      li.append(b, input);
      comments.append(li);
    }
    if (focusId) {
      const t = comments.querySelector<HTMLTextAreaElement>(
        `[data-comment-id="${focusId}"]`,
      );
      t?.focus();
      if (selection !== null && selection !== undefined)
        t?.setSelectionRange(selection, selection);
    }
  }
  function render() {
    renderDrawing();
    renderComments();
  }
  function addAt(x: number, y: number) {
    remember(clone());
    const a: Annotation = {
      id: nextId++,
      tool: tool === 'text' ? 'text' : 'bubble',
      x,
      y,
      endX: x,
      endY: y,
      color: color.value,
      size: Number(size.value),
      points: `${x},${y}`,
      comment: '',
    };
    if (a.tool === 'bubble')
      a.number = 1 + Math.max(0, ...items.map((a) => a.number || 0));
    items.push(a);
    render();
    status(a.number ? `Callout ${a.number} added` : 'Text annotation added');
  }
  host
    .querySelectorAll<HTMLButtonElement>('[data-tool]')
    .forEach((b) =>
      b.addEventListener('click', () => setTool(b.dataset.tool as Tool)),
    );
  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const p = point(e);
    start = p;
    before = clone();
    const hit = (e.target as Element).closest<SVGElement>('[data-id]');
    if (tool === 'eraser') {
      if (hit) {
        remember(before);
        items = items.filter((a) => a.id !== Number(hit.dataset.id));
        render();
        status('Annotation erased');
      }
      return;
    }
    if (tool === 'bubble' || tool === 'text') {
      addAt(p.x, p.y);
      return;
    }
    if (tool === 'select') {
      if (!hit) return;
      active = items.find((a) => a.id === Number(hit.dataset.id)) || null;
    } else {
      active = {
        id: nextId++,
        tool,
        x: p.x,
        y: p.y,
        endX: p.x,
        endY: p.y,
        color: color.value,
        size: Number(size.value),
        points: `${p.x},${p.y}`,
        comment: '',
      };
      items.push(active);
    }
    svg.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  svg.addEventListener('pointermove', (e) => {
    if (!active) return;
    const p = point(e);
    if (tool === 'select') {
      const dx = p.x - start.x,
        dy = p.y - start.y;
      active.x += dx;
      active.y += dy;
      active.endX += dx;
      active.endY += dy;
      active.points = active.points
        .split(' ')
        .map((v) => {
          const [x, y] = v.split(',').map(Number);
          return `${x + dx},${y + dy}`;
        })
        .join(' ');
      start = p;
    } else {
      active.endX = p.x;
      active.endY = p.y;
      active.points += ` ${p.x},${p.y}`;
    }
    renderDrawing();
  });
  const finish = () => {
    if (active) {
      remember(before);
      active = null;
      render();
      status('Annotation updated');
    }
  };
  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', finish);
  const undo = () => {
    if (past.length) {
      future.push(clone());
      items = past.pop()!;
      render();
      status('Undone');
    }
  };
  const redo = () => {
    if (future.length) {
      past.push(clone());
      items = future.pop()!;
      render();
      status('Redone');
    }
  };
  host.querySelector('[data-undo]')!.addEventListener('click', undo);
  host.querySelector('[data-redo]')!.addEventListener('click', redo);
  host.querySelector('[data-clear]')!.addEventListener('click', () => {
    if (items.length) {
      remember(clone());
      items = [];
      render();
      status('Demo cleared');
    }
  });
  host.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).matches('input,textarea')) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
      return;
    }
    const keys: Record<string, Tool> = {
      v: 'select',
      p: 'pen',
      h: 'highlighter',
      a: 'arrow',
      o: 'circle',
      t: 'text',
      b: 'bubble',
      e: 'eraser',
    };
    if (keys[e.key.toLowerCase()]) {
      setTool(keys[e.key.toLowerCase()]);
      e.preventDefault();
    }
    if (e.key === 'Enter' && e.target === sheet) {
      addAt(290, 255);
      e.preventDefault();
    }
    const target = (e.target as HTMLElement).closest<SVGElement>('[data-id]');
    const a = items.find((a) => a.id === Number(target?.dataset.id));
    if (
      a &&
      [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Delete',
        'Backspace',
      ].includes(e.key)
    ) {
      e.preventDefault();
      remember(clone());
      if (e.key === 'Delete' || e.key === 'Backspace')
        items = items.filter((i) => i !== a);
      else {
        const dx = e.key === 'ArrowLeft' ? -5 : e.key === 'ArrowRight' ? 5 : 0,
          dy = e.key === 'ArrowUp' ? -5 : e.key === 'ArrowDown' ? 5 : 0;
        a.x += dx;
        a.endX += dx;
        a.y += dy;
        a.endY += dy;
      }
      render();
      layer.querySelector<SVGElement>(`[data-id="${a.id}"]`)?.focus();
    }
  });
  render();
}
