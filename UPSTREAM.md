# Upstream lineage

Maybe's visual dice geometry and original WebGL / physics implementation began from the upstream pre-removal demo revision that matches the supplied reference:

- Repository: `uuuulala/Threejs-rolling-dice-tutorial`
- Commit: `c96ce297c1eae0066054425c8f8a6460bd448c3e`
- Original `js/main.js` Git blob SHA-1: `3055da6c17ddb98002435abdef5bd66a089aea2b`

That revision supplied the two-dice renderer, `MapControls`, geometry/pip construction, cannon-es bodies, face detection, double-click throwing, and pan/zoom interaction.

The active `js/main.js` is now a focused derivative. It retains the mesh construction, materials, lighting, camera, controls, floor, and face-orientation logic while adding:

- a dynamic 1–5 dice scene/physics lifecycle;
- separated count-specific launch formations;
- invisible physical play-area boundaries;
- edge-settle recovery;
- indexed result collection after every selected die settles;
- the small `window.MaybeDice` bridge used by the product and Site Tools.

`tests/check_upstream.py` verifies the retained geometry pipeline, the required variable-dice physics contracts, and product-layer isolation.

The decision product layer lives in:

- `js/decision-ui.js`
- `js/mapping.js`
- `js/storage.js`
- `js/webmcp.js`
- additive HTML/CSS around the canvas and visible controls

Those product/WebMCP files do not import Three.js or cannon-es.
