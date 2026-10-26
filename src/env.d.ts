/// <reference types="vite/client" />
/** Build-time constants injected by vite.config.ts `define` (owner WP-00). */
declare const __HANMOTO_VERSION__: string;

/** Per-language content bundles served by build/ssg-plugin.ts (owner WP-00). */
declare module 'virtual:hanmoto/content-*' {
  import type { Content, ImagesIndex, ManifestEntry } from './content/types';
  const bundle: { content: Content; manifest: readonly ManifestEntry[]; images: ImagesIndex };
  export default bundle;
}
