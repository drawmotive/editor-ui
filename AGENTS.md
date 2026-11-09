# Editor UI

This public package owns reusable React/Mantine drawing controls. Keep canvas
operations on the public exports of @drawmotive/editor. Authentication,
navigation, collaboration transport and document storage belong to hosts.

- Write repository-authored documentation, comments, diagnostics, test names,
  configuration descriptions and instructions in English.
- Preserve intentional multilingual fixture data and upstream license notices.
- Use npm with the committed package-lock.json; install with npm ci.
- Preserve public exports and UI behavior when changing distribution tooling.
- Run npm test, npm run build, npm run test:browser and npm run test:package
  before claiming a package change is verified. Browser commands require
  Chromium installed with npx playwright install chromium.
- Keep fixture bundles and source files outside the npm archive. Preserve
  Material Symbols license and notice files in every embedding distribution.
- Release identity is projected into .release/target.json by the integration
  repository. Publish only the retained archive through the release workflow.
