/**
 * The one CSS bundle (DESIGN §8.4): global styles + chrome + every section's style.css, imported statically
 * so the build emits a single render-blocking stylesheet (no FOUC). Fonts CSS lives in public/fonts/.
 * Owner: WP-00. Order matters: tokens → base → type → layout → marks → motion → lenis → chrome → sections.
 */
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/type.css';
import '../styles/layout.css';
import '../styles/marks.css';
import '../styles/motion.css';
import 'lenis/dist/lenis.css';
import '../chrome/style.css';
import '../chrome/cursors.css';
import '../chrome/print.css';
import './cover/style.css';
import './summary/style.css';
import './road/style.css';
import './works/style.css';
import './skills/style.css';
import './principles/style.css';
import './achievements/style.css';
import './writing/style.css';
import './testimonials/style.css';
import './contact/style.css';
import './colophon/style.css';
