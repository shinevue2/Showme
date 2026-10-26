/**
 * Asset URLs (DESIGN §8.9). Owner: WP-00.
 * Runtime URLs to public/ files always go through `url()`: dev → '/' + p; build → new URL('../' + p,
 * import.meta.url) (every chunk lives in dist/assets/, so '../' is the site root at any page depth and under
 * any sub-path).
 */
import type { AssetAPI, FilmManifest } from './types';
import type { ImagesIndex, ManifestEntry } from '../content/types';
import { pictureHtml } from '../render/helpers';
import filmJson from '../film/film-manifest.json';

export function assetUrl(rootRelative: string): string {
  const p = rootRelative.replace(/^\/+/, '');
  if (import.meta.env.DEV) return '/' + p;
  return new URL('../' + p, import.meta.url).href;
}

export function createAssets(manifest: readonly ManifestEntry[], images: ImagesIndex): AssetAPI {
  const film = filmJson as unknown as FilmManifest;
  return {
    url: assetUrl,
    img(file, opts) {
      const tpl = document.createElement('template');
      tpl.innerHTML = pictureHtml(file, opts, images, assetUrl);
      const pic = tpl.content.firstElementChild as HTMLPictureElement;
      pic.querySelectorAll('[vite-ignore]').forEach((n) => n.removeAttribute('vite-ignore'));
      return pic;
    },
    imageInfo: (file) => images[file],
    manifest,
    film,
  };
}
