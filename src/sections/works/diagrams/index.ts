/** The six sangaku diagrams, one per case (DESIGN §12 #23). Owner: WP-07. Node-safe. */
import type { CaseId } from '../../../content/types';
import type { Diagram } from './kit';
import { ledger } from './ledger';
import { tracing } from './tracing';
import { mapgl } from './mapgl';
import { strangler } from './strangler';
import { platform } from './platform';
import { resilience } from './resilience';

export const DIAGRAMS: Readonly<Record<CaseId, () => Diagram>> = { ledger, tracing, mapgl, strangler, platform, resilience };
export { renderDiagram } from './kit';
export { walkthrough, walkParts, walkIntro, pillarNote } from './walkthrough';
