// The four editions of ENG Drawing Viewer and what the site may say about each. Availability, file
// names, sizes and checksums never come from here: only from src/data/release.json, which
// scripts/sync-release.mjs writes from verified public GitHub releases.
import release from './release.json';

export type EditionId = 'macos-universal' | 'macos-apple-silicon' | 'windows-x64' | 'linux-x86_64';

export interface Asset {
  name: string;
  url: string;
  size: number;
  sha256: string;
  version: string;
  preview: boolean;
  published: string;
  release_url: string;
}
export type Edition = { id: EditionId; available: false } | ({ id: EditionId; available: true; extras: Asset[] } & Asset);

export const info: Record<
  EditionId,
  { name: string; short: string; tagline: string; arch: string; requires: string; format: string; signing: string }
> = {
  'macos-universal': {
    name: 'macOS Universal',
    short: 'Mac · Universal',
    tagline: 'For every Mac: Intel and Apple silicon.',
    arch: 'Intel (x86_64) + Apple silicon (arm64)',
    requires: 'macOS 14.4 or later',
    format: 'Disk image (DMG)',
    signing: 'Not notarized: open it once with Open Anyway',
  },
  'macos-apple-silicon': {
    name: 'macOS Apple Silicon',
    short: 'Mac · Apple silicon',
    tagline: 'Native ARM64 build for M-series Macs.',
    arch: 'Apple silicon (arm64), M1 or newer',
    requires: 'macOS 14.4 or later',
    format: 'Disk image (DMG)',
    signing: 'Not notarized: open it once with Open Anyway',
  },
  'windows-x64': {
    name: 'Windows',
    short: 'Windows',
    tagline: 'Standalone Windows x64 edition.',
    arch: '64-bit (x64)',
    requires: 'Windows 10 (1809 or later) or Windows 11',
    format: 'Portable ZIP, no installation',
    signing: 'Not code-signed: SmartScreen may ask once',
  },
  'linux-x86_64': {
    name: 'Linux',
    short: 'Linux',
    tagline: 'Portable x86-64 AppImage.',
    arch: '64-bit (x86-64)',
    requires: 'glibc 2.34 or later (Ubuntu 22.04, Debian 12, Fedora 35, RHEL 9 or newer)',
    format: 'AppImage, one file',
    signing: 'Not signed: verify with SHA-256',
  },
};

export const editions = release.editions as Edition[];
export const edition = (id: EditionId) => editions.find((e) => e.id === id)!;
export const sourceAsset = release.source as Asset | null;
export const megabytes = (bytes: number) => `${(bytes / 1e6).toFixed(1)} MB`;
export const releaseDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
// The editors (Image, Vector, Edit PDF) and the Linux and Universal editions arrive with 2.3.0.
export const hasEditors = (e: Edition) => e.available && compare(e.version, '2.3.0') >= 0;
export function compare(a: string, b: string) {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i];
  return 0;
}
export const allEditorsReleased = editions.every((e) => hasEditors(e));
