# Verification and demonstration checklist

## Automated checks

From `backend`, using its virtual environment:

```powershell
.\venv\Scripts\python -m pytest -q
```

From `frontend`:

```sh
npm test
npm run build
```

Verified: **36 backend tests**, **3 frontend API-client tests**, and a successful production build. The backend tests use a temporary SQLite database for run/history/export mutations.

Covered: all three demand distributions and models; all eight scenarios; inventory conservation; transfers cancelling in system profit; storage/production limits; turnover valuation; zero demand/capacity; manual observations; approximate probability normalization; Bayesian likelihoods and expected-utility choice; repeated-game memory and discounting; no future-demand leakage; pure Nash equilibria; input validation including nonfinite JSON numbers; history opening/deletion; CSV and reproducible experiment exports.

Current nonfatal toolchain messages: Starlette warns about its httpx TestClient compatibility; Vite reports a JavaScript chunk above 500 kB (about 206 kB gzip). Neither fails a check. Additional code splitting is optional for this local demo.

## Browser checks performed

- Opened the Vite development app and the production build served directly from FastAPI.
- Ran the default 30-round demo and inspected real dashboard metrics and charts.
- Ran all three models with matched demand; inspected profit, service, stockout and bullwhip comparisons.
- Ran 100 paired experiments per model and inspected means/standard deviations.
- Opened repeated-game round data and Bayesian prior/posterior curves, candidate payoffs and actual utilities.
- Played the supply-chain replay and verified the round advanced and values changed.
- Solved the sample custom payoff matrix; verified row 2 / column 2 is the pure Nash equilibrium.
- Loaded the High holding cost scenario, checked its 3/6/9 holding costs, changed to a five-round baseline run and submitted it.
- Found the saved run in History, reopened it and inspected the printable report and parameters.
- Downloaded actual round CSV, full simulation JSON and experiment summary CSV through native download links.
- Checked desktop and 390-pixel mobile layouts; mobile overview had no horizontal page overflow.
- Navigated the explanation/About pages. The final production session had no browser console warnings or errors.

Screenshots in `screenshots/` are captures of the running application, not UI mockups.

## Repeat before a presentation

1. Start both development servers, or build the frontend and start only FastAPI.
2. Run the demo; select JSON/CSV and confirm the files open.
3. Inspect the default run, then compare all models and explain that greater profit need not mean less stock.
4. Try a capacity shortage and inspect lost demand.
5. Use History to reopen a run after refreshing the page. Checkboxes compare saved runs; the delete button removes a saved run permanently.
6. Open Printable report, press Print / Save as PDF, and inspect paper size, margins and page breaks on the presentation computer. The native print dialog/PDF output is platform-dependent and was not exported during verification.
