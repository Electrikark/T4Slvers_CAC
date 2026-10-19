# Rules v1.1 staged validation

Branch: `rules-v1.1`. Base: repaired pre-F1–F5 commit `aa48952`.
The prior combined implementation remains untouched in `/workspace/T4Slvers_CAC`.

The evaluator now selects the requested split **before** engine analysis. Its regression test failed before the change and passes after it. No held-out corpus rows have been evaluated.

| Stage | New rule tests before implementation | New rule tests after implementation | npm test | Dev fraud caught | D | E | Legit dev Suspicious |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Baseline | N/A | N/A | Pass | unavailable | unavailable | unavailable | unavailable |
| F1 | Failed as expected | 38/38 | Pass | unavailable | unavailable | unavailable | unavailable |
| F2 | Pending | Pending | Pending | unavailable | unavailable | unavailable | unavailable |
| F3 | Pending | Pending | Pending | unavailable | unavailable | unavailable | unavailable |
| F4 | Pending | Pending | Pending | unavailable | unavailable | unavailable | unavailable |
| F5 | Pending | Pending | Pending | unavailable | unavailable | unavailable | unavailable |

For each completed stage, `npm run eval -- --split dev` was invoked and exited 2 because `eval/data/messages.csv` is absent. Unavailable is not zero. The meanings of D and E and the existing failure taxonomy must come from the supplied analysis script/spec; they are not guessed here. Logs are in `docs/rules-v1.1-logs/`.

The user supplied Mac paths for the locked corpus with SHA-256 `30916d1f386a3f5feb67f544be323861b62ac7b4405dd298c2c508686c87f6ab` and a revised corpus with SHA-256 `8f7788ce5f8d034b83cf3410dfec505bf5a89c76e13d3026c1581104699ccab3`. Neither file is accessible in this cloud workspace. `eval/analyze-dev.cjs` is also absent. No synthetic rows are substituted for those datasets.

After the user's instruction to continue, implementation proceeds with constructed positive and negative regression cases, without claiming the dev false-alarm requirement is verified. The zero-legitimate-dev-Suspicious acceptance condition remains unverified until the corpus is available.

## F1

Added pressure-free named-tool requests and nearby session/connection references. Negation, reported examples, the Wells Fargo advice and informational tool mentions remain excluded. Opening an article about AnyDesk or sharing a TeamViewer guide is also excluded. Generic remote access retains its existing pressure requirement. Updated prior expectations that explicitly required pressure for named tools.
