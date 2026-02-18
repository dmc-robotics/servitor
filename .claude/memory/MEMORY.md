# Servitor Project Memory

## Unovis Chart Resize Fix
Unovis sets SVG `width` as an HTML attribute (`svg.attr('width', px)`), not inline CSS. This fixed pixel width prevents flex containers from shrinking on window resize (ResizeObserver reads `clientWidth` from the same element the SVG inflates — deadlock). CSS `overflow: hidden` does NOT reliably break this in Chromium.

**Fix:** Two-phase resize via `window.resize` event: set `containerWidth = 1` (SVG shrinks, layout frees), then `$nextTick` → re-measure real width. ResizeObserver still handles growth and initial sizing. See `SerialPlotter.vue`.