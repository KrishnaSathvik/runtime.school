# Design system — Course studio

Two surfaces, one product.

Learning pages are a quiet black-and-white course: white or near-black canvas, Geist Sans for navigation and controls, Source Serif 4 for lesson prose and editorial headings. Subject color appears only on icon tiles, the current lesson step, and progress. Task panes separate Your task / Required output / Expected / Tables with hairline rules; table schemas stack one column per row (name, type, PK/FK).

The coding workspace follows the app theme: light editor in light mode, dark editor in dark mode. Geist Mono for SQL. Toolbar, one `query.sql` buffer, line numbers, and a resizable results region. Semantic green, red, and amber are for real feedback only.

## Light

Canvas `#FFFFFF`, sidebar `#F6F6F6`, text `#111111`, secondary text `#3F3F3F`, border `#E6E6E6`. Primary button `#111111` on white.

## Dark

Canvas `#0C0C0C`, surface `#141414`, text `#F4F4F4`, border `#2C2C2C`. Primary button `#F5F5F5` with near-black text.

## Editor

Light: background `#FFFFFF`, chrome `#F6F6F6`, border `#E6E6E6`, text `#111111`.
Dark: background `#1E1E1E`, chrome `#252526`, border `#3C3C3C`, text `#D4D4D4`.

## Subject signal

SQL `#1D4F91` (light) / `#9EB6E0` (dark), used for the current step and progress, not for buttons.
