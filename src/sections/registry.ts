/**
 * Section registry (DESIGN §8.5 conventions). Owner: WP-00.
 * Maps section ids to lazy `import('./<id>/index')`; each module's default export is a SectionModule.
 * Boot mounts cover + summary right after first paint and every other section when it comes within two
 * viewports (IntersectionObserver rootMargin 200%).
 */
import type { SectionId, SectionModule } from '../core/types';

export const SECTIONS: Readonly<Record<SectionId, () => Promise<{ default: SectionModule }>>> = {
  cover: () => import('./cover/index'),
  summary: () => import('./summary/index'),
  road: () => import('./road/index'),
  works: () => import('./works/index'),
  skills: () => import('./skills/index'),
  principles: () => import('./principles/index'),
  achievements: () => import('./achievements/index'),
  writing: () => import('./writing/index'),
  testimonials: () => import('./testimonials/index'),
  contact: () => import('./contact/index'),
  colophon: () => import('./colophon/index'),
};

/** Sections mounted immediately after first paint (§8.8 step 3). */
export const EAGER_SECTIONS: readonly SectionId[] = ['cover', 'summary'];
