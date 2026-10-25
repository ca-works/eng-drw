# Engineering visual construction

25 October 2026. This revision replaces the earlier schematic model after the owner identified inconsistent roots, decorative holes and unsupported drawing dimensions.

## Sources consulted

- [NASA hybrid blade attachment project](https://techport.nasa.gov/projects/18451): blade dovetail attachment to a slotted disc.
- [SOLIDWORKS section views](https://help.solidworks.com/2022/english/SolidWorks/sldworks/c_section_views_in_drawings.htm): a section is derived by cutting a parent view.
- [SOLIDWORKS section-view properties](https://help.solidworks.com/2023/english/SolidWorks/sldworks/HIDD_DVE_SECTION_PROP.htm): section labels, hatching and projected dimensions.
- [SOLIDWORKS dimension extension lines](https://help.solidworks.com/2025/english/SolidWorks/sldworks/c_Dimension_Extension_Lines.htm): geometry attachment points and extension lines.
- [University of Lyon airfoil construction](https://perso.univ-lyon1.fr/marc.buffat/COURS/BOOK_ATELIERNUM_HTML/ATELIER_NUM/TP_NACA/ProfilNaca.html): closed NACA-style thickness polynomial.

References inform construction, not copied artwork. No external model, texture, engineering drawing or proprietary engine specification is distributed. These sources do not certify this concept model, its aerodynamic fitness, or the drawing's compliance with a complete ISO/ASME manufacturing standard. It is not a SolidWorks export. It uses familiar CAD drawing conventions with an explicitly identified concept status.

## One source of geometry

`src/geometry/turbine.ts` holds dimensions in millimetres, closed section points, blade loft projections, dovetail profile and section hatch clipping. `turbine-mesh.ts` builds the three-dimensional objects from those values. `Drawing.astro` uses the same section/projection functions, not a separately invented silhouette.

The rotor has 18 identical solid, uncooled blades with a continuous dovetail root and platform. Matching open slots are cut into the disc outline; root/slot circumferential spacing is tested to avoid intersection. The selected blade slides axially out of its slot, enlarges in an oblique view, then aligns to the front projection. No roots are hidden selectively. No simulated cooling passages are claimed. RoomEnvironment provides procedural studio reflections; neutral metal replaces the blue plastic appearance. The environment is generated locally without downloaded textures.

Drawing values: span 88 mm, overall height 114 mm, platform length 50 mm, root width 22 mm. Front and right views are aligned. A–A is the cut at 44 mm span with directional arrows; its closed outline and clipped hatching are computed at that station. Centerlines, visible edges and section lines have distinct line styles. Dimensions anchor to model boundaries. There are no invented tolerances, material certifications or manufacturing instructions. The sheet does not claim a physical paper format or calibrated print scale.

## Validation

Unit checks cover non-intersecting root pitch, actual root width/height, orthographic envelopes against loft sections, midspan location and finite closed section sampling. Browser checks cover the complete transition and replay as well as failure fallback and reduced motion. The initial pose timer begins after first shader rendering so shader preparation does not consume the first visual beat. Initial browser-sequence polling was made explicit via Replay to avoid a page-load timing race.

Actual application images are recaptured from real Qt widgets using the new generated vector PDF. The web illustration does not claim the application has CAD modelling or 3D conversion features.
