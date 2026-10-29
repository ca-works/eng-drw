// Suggests the edition for this computer. It only adds a "Recommended" mark and a sentence; every
// edition stays visible and selectable. When the platform or the Mac's processor can't be told
// reliably, nothing is assumed: a Mac of unknown type is pointed at Universal, which runs on all Macs.
type Platform = { os: 'mac' | 'windows' | 'linux' | 'mobile' | null; arch: 'arm' | 'x86' | null };

async function detect(): Promise<Platform> {
  const ua = navigator.userAgent;
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string; mobile?: boolean; getHighEntropyValues?: (h: string[]) => Promise<{ architecture?: string }> };
  };
  // iPadOS reports itself as a Mac; touch points tell them apart.
  if (/iPhone|iPad|Android/i.test(ua) || nav.userAgentData?.mobile || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1))
    return { os: 'mobile', arch: null };
  const os = /Windows/.test(ua) ? 'windows' : /Macintosh|Mac OS X/.test(ua) ? 'mac' : /Linux|X11|CrOS/.test(ua) ? 'linux' : null;
  if (os !== 'mac') return { os, arch: null };
  // Chromium browsers report the processor architecture on request.
  try {
    const h = await nav.userAgentData?.getHighEntropyValues?.(['architecture']);
    if (h?.architecture === 'arm') return { os, arch: 'arm' };
    if (h?.architecture === 'x86') return { os, arch: 'x86' };
  } catch {}
  // Otherwise the graphics renderer's name, where the browser exposes it ("Apple M2", "Intel(R) Iris").
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const name = ext && gl ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    if (/Apple M\d/.test(name)) return { os, arch: 'arm' };
    if (/Intel|AMD|Radeon/.test(name)) return { os, arch: 'x86' };
  } catch {}
  return { os, arch: null };
}

async function suggest(picker: HTMLElement) {
  const { os, arch } = await detect();
  const note = picker.querySelector<HTMLElement>('[data-suggestion]');
  const card = (id: string) => picker.querySelector<HTMLElement>(`[data-edition="${id}"]`);
  const available = (id: string) => card(id)?.dataset.available === 'true';
  let id: string | null = null;
  let text = '';
  if (os === 'mac' && arch === 'arm') {
    id = 'macos-apple-silicon';
    text = 'This Mac has Apple silicon: the Apple Silicon edition is made for it.';
  } else if (os === 'mac' && arch === 'x86') {
    id = 'macos-universal';
    text = 'This Mac has an Intel processor: choose the Universal edition.';
    if (!available(id)) text += ' It is coming soon; the Apple Silicon edition does not run on Intel Macs.';
  } else if (os === 'mac') {
    id = 'macos-universal';
    text = available(id)
      ? 'Universal runs on every Mac. On a Mac with Apple silicon (Apple menu › About This Mac shows “Chip: Apple M…”), the Apple Silicon edition is smaller.'
      : 'Which chip does this Mac have? Apple menu › About This Mac shows it. Apple silicon (M1 or newer): the Apple Silicon edition. Intel: the Universal edition, coming soon.';
    if (!available(id)) id = null;
  } else if (os === 'windows') {
    id = 'windows-x64';
    text = 'For this PC: the Windows edition.';
  } else if (os === 'linux') {
    id = 'linux-x86_64';
    text = 'For this computer: the Linux AppImage (x86-64).';
  } else if (os === 'mobile') {
    text = 'ENG Drawing Viewer is a desktop app for Mac, Windows and Linux. Send this page to your computer.';
  }
  if (id) card(id)?.setAttribute('data-recommended', '');
  if (note && text) {
    note.textContent = text;
    note.hidden = false;
  }
}

document.querySelectorAll<HTMLElement>('[data-edition-picker]').forEach((p) => void suggest(p));
