# Precision — art direction

Research references reviewed 24 October 2026: Apple Mac, Linear, Raycast and GSAP. Apple informed the generous spacing and large product framing; Linear informed restrained surfaces and compact labels; Raycast informed concrete, interactive workflow demonstrations. No third-party layout or artwork is copied.

Paper white and graphite support the owner's original sky-blue icon. Real red callouts are reserved for markup. Drafting grids, revision labels and original flange linework provide the product-specific visual language. The site uses Inter Variable and JetBrains Mono, served locally under OFL.

GSAP core and ScrollTrigger provide drawing assembly, gentle section entrances and perspective settling. Native SVG and pointer events drive the simplified MARK demo. No Three.js, animation-framework duplication or scroll hijacking. Reduced motion disables GSAP and CSS transitions. Native dialog provides a mobile focus trap.

All web interactions are explicitly illustrations. Real screenshots show the actual desktop application with fictional sample drawings. This distinction must survive future visual changes. Do not imply CAD editing or native Office document reconstruction.

## Owner-directed 3D opening — 25 October 2026

The owner explicitly requested an original Three.js animation at the beginning of the homepage and a less generic composition. This supersedes the previous no-Three.js decision above. The opening now uses an asymmetric editorial layout, large compact typography and a procedural bearing-flange assembly. No purchased model, texture, stock illustration or CAD document is used. The composition is explicitly illustrative, not a claim that the desktop application edits 3D models.

`HeroScene.astro` progressively loads `assembly.ts`. Desktop pointer devices animate assembly and allow subtle pointer tilt and replay. Touch devices and reduced-motion users receive an optimized transparent poster captured from this same model, with explicit opt-in to load 3D. Reduced motion renders a static pose even after opt-in. The canvas stops rendering when settled or outside the viewport; context loss/module failure preserves the poster. Native scrolling remains untouched.

Three.js is MIT licensed; complete installed licence is in `public/licenses/Three-MIT.txt`. Official reference: https://github.com/mrdoob/three.js/blob/dev/LICENSE. The optional engine is isolated into `three-engine.*.js` (136 KiB gzip). The previous 100 KiB core JS budget stays in force; the user-requested optional engine has a separate 200 KiB ceiling. Current core is 49 KiB and CSS 19 KiB gzip. The build warning for an uncompressed >500 kB optional chunk is retained, not hidden.


## Turbine-to-drawing revision — owner direction

Replaced the flange with an original 24-blade turbine study. A selected blue blade lifts out and enlarges, showing curved airfoil, cooling perforations, platform and root. Its actual mesh edges replace its shaded surface, accompanied by dimension lines and an airfoil section; the smaller turbine remains visible for context. The one-shot sequence ends within five seconds and can be replayed. Geometry, SVG and example PDFs are original conceptual illustrations, not real engine specifications or an application CAD-conversion claim.

Removed the hero eyebrow, figure/caption/axis labels, slogan chips, decorative screenshot coordinates and numbered section headings. Functional controls and document annotations remain. Updated the zoom/MARK/slide examples, sample PDFs and real application captures to use the turbine study. No third-party model/licence dependency added. Mobile poster and reduced-motion opt-in remain.

## Current engineering correction

The earlier stylized turbine is superseded by the shared dimensioned model described in ENGINEERING_VISUALS.md:18 identical uncooled blades, actual dovetail slots and axial extraction, neutral metal with procedural studio reflections. The final white engineering sheet uses computed front/right views, a marked44mm section and dimension anchors derived from the same model. Decorative holes and unsupported labels are removed. No statement of full ISO/ASME compliance or SolidWorks authorship is made.
