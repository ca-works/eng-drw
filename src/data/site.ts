export const site = {
  name: 'ENG Drawing Viewer',
  publisher: 'ca-works',
  url: 'https://ca-works.github.io/eng-drw/',
  repo: 'https://github.com/ca-works/eng-drw',
  appRepo: 'https://github.com/ca-works/eng-drawing-viewer',
};
export const url = (path = '') =>
  `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
