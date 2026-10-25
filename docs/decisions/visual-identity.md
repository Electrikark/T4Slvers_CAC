# Safety4Seniors visual identity

The app should feel like a thoughtful safety guide: clear enough to use under
stress, warm enough to return to, and precise about its limits. Its identity
comes from type, color roles, and a small reading mark.

## Rules

| Element | Choice | Purpose |
| --- | --- | --- |
| Page | Warm paper, `#f6f2e8` | A reading surface with a warmer tone than a gray dashboard. |
| Brand and primary action | Forest, `#183f38` | A stable visual anchor across every page. |
| Main activity | Forest surface with cream text | Makes the Home entry point and Learn practice distinct from reference text. |
| Form and action plan | Light paper, `#fffdf6`, with an ink-green top rule | Keeps editable fields and protective steps easy to find. |
| Caution | Amber paper and brown ink | Identifies risky findings, urgent payment guidance, and pending review notes. |
| Record match or unresolved check | Restrained light surface and exact label | Avoids turning a narrow record match into a visual safety certificate. |
| Main titles and brand | Georgia serif | Gives the guide a clear editorial voice without loading a font. |
| Instructions and controls | Arial sans serif, 18 px base | Keeps action text direct and familiar. |
| Brand mark | A pause inside a message outline | Connects the identity to taking time before acting. It also serves as the favicon. |

The mark is a local SVG. It is part of the Home link, with an empty image alt so
the link's accessible name is read once. It is never a separate pause control.

Use forest as a brand and activity color, not as evidence that a message is safe.
Risk labels, reasons, protective steps, and sender uncertainty remain written
out. Color alone never carries a result.

Sections use rules and alignment by default. A surface groups a specific task,
form, result, or help route. Warning signs remain reading rows; protective steps
use a short annotation rule. Page jumps are underlined text links. Corners stay
modest, and the input form has the only subtle depth shadow.

## Reading and access

The layout keeps the page priorities in [balanced-layout.md](balanced-layout.md)
and the safety rules in [clear-action-ui.md](clear-action-ui.md). Phones stack
the two Learn columns. Large control targets and enlarged-text reflow remain.
Focus rings adapt to light and dark surfaces. Print uses dark text on white;
forced-color mode preserves selected controls with an outline.

Calculated contrast for the new core pairs is 10.70:1 for body text, 5.85:1 for
secondary text, 11.17:1 for cream text on forest, and 7.96:1 for caution text.
These are checks of named color pairs, not a full accessibility certification.

The local preview explicitly serves the SVG with its image MIME type. It keeps
the existing restriction on private paths and does not open the whole assets
tree.
