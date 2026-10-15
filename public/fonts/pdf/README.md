# PDF font assets

Static TrueType copies of the existing Runtime web fonts, used only by the lazy-loaded project PDF exporter. Licenses and attribution are in `../GEIST-LICENSE.txt` and `../SOURCE-SERIF-LICENSE.txt`.

The WOFF2 fonts cannot be subset directly by the PDF font engine. These files were decoded with FontTools and Brotli, with variable axes pinned to their defaults and weight pinned to 400. Regenerate after changing the source fonts:

```python
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

for name in ['geist-sans', 'geist-mono', 'source-serif-4-latin']:
    font = TTFont(f'public/fonts/{name}.woff2')
    if 'fvar' in font:
        axes = {axis.axisTag: axis.defaultValue for axis in font['fvar'].axes}
        axes['wght'] = 400
        font = instantiateVariableFont(font, axes, inplace=True)
    font.flavor = None
    font.save(f'public/fonts/pdf/{name}.ttf')
```

FontTools and Brotli are build-time conversion tools, not app runtime dependencies.

`geist-sans-semibold.ttf` is generated from `geist-sans.woff2` with weight pinned to 650 for PDF headings.
