const REPO = "squidKid-deluxe/HONEST-feeds-live";
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/`;
const API_BASE = `https://api.github.com/repos/${REPO}`;
const STALE_SECONDS = 7200;

// Same gateway/token set as render_price_logs.py dex_table()
const CURRENCIES = [
  "GDEX.BTC",
  "XBTSX.BTC",
  "GDEX.USDT",
  "XBTSX.USDT",
  "IOB.XRP",
  "BTWTY.EOS",
];

// Same exchange whitelist as render_price_logs.py cex_table()
const EXCHANGES = {
  "ADA:BTC": ["whitebit", "bitrue", "coinbase", "kucoin", "xt", "mexc", "kraken", "poloniex", "gate"],
  "ADA:USD": ["coinbase", "kraken", "whitebit"],
  "ADA:USDT": ["xt", "okx", "poloniex", "bitrue", "gate", "mexc", "whitebit", "kucoin", "kraken", "coinbase"],
  "ALGO:BTC": ["whitebit", "kraken", "coinbase", "kucoin"],
  "ALGO:USD": ["coinbase", "kraken"],
  "ALGO:USDT": ["whitebit", "okx", "bitrue", "kraken", "kucoin", "gate", "mexc", "xt"],
  "ATOM:BTC": ["kraken", "whitebit", "kucoin", "mexc", "coinbase", "gate"],
  "ATOM:USD": ["coinbase", "kraken"],
  "ATOM:USDT": ["poloniex", "whitebit", "okx", "kucoin", "mexc", "bitrue", "gate", "xt", "kraken", "coinbase"],
  "BTC:USD": ["coinbase", "kraken", "whitebit", "gate"],
  "BTC:USDT": ["bitrue", "gate", "okx", "kucoin", "xt", "poloniex", "whitebit", "mexc", "kraken", "coinbase"],
  "BTS:USDT": ["mexc", "gate", "poloniex"],
  "DOT:BTC": ["whitebit", "mexc", "coinbase", "kucoin", "kraken", "poloniex", "gate"],
  "DOT:USD": ["coinbase", "kraken"],
  "DOT:USDT": ["kucoin", "okx", "gate", "xt", "poloniex", "mexc", "whitebit", "bitrue", "kraken", "coinbase"],
  "EOS:BTC": ["mexc", "kucoin"],
  "EOS:USDT": ["kucoin", "mexc"],
  "ETH:BTC": ["whitebit", "okx", "coinbase", "bitrue", "kucoin", "kraken", "xt", "gate", "mexc", "poloniex"],
  "ETH:USD": ["coinbase", "kraken", "whitebit", "gate"],
  "ETH:USDT": ["gate", "okx", "mexc", "xt", "kucoin", "poloniex", "whitebit", "bitrue", "kraken", "coinbase"],
  "FIL:BTC": ["whitebit", "xt", "kraken", "gate"],
  "FIL:USD": ["coinbase", "kraken"],
  "FIL:USDT": ["okx", "whitebit", "poloniex", "xt", "mexc", "kucoin", "gate", "bitrue"],
  "LTC:BTC": ["bitrue", "kucoin", "whitebit", "mexc", "kraken", "xt", "coinbase", "gate", "poloniex"],
  "LTC:USD": ["coinbase", "kraken", "whitebit"],
  "LTC:USDT": ["kucoin", "xt", "gate", "poloniex", "okx", "mexc", "whitebit", "bitrue", "kraken"],
  "SOL:BTC": ["whitebit", "okx", "kraken", "coinbase", "xt", "mexc", "poloniex"],
  "SOL:USD": ["coinbase", "kraken", "whitebit"],
  "SOL:USDT": ["gate", "xt", "mexc", "okx", "whitebit", "kucoin", "poloniex", "bitrue", "kraken", "coinbase"],
  "XLM:BTC": ["whitebit", "kucoin", "coinbase", "kraken", "mexc", "gate", "poloniex"],
  "XLM:USD": ["coinbase", "kraken"],
  "XLM:USDT": ["bitrue", "kucoin", "okx", "whitebit", "xt", "poloniex", "gate", "mexc", "coinbase"],
  "XMR:BTC": ["kucoin", "kraken", "poloniex"],
  "XMR:USD": ["kraken"],
  "XMR:USDT": ["kucoin", "poloniex", "kraken", "whitebit", "mexc", "xt", "bitrue"],
  "XRP:BTC": ["whitebit", "xt", "kraken", "bitrue", "kucoin", "mexc", "gate", "poloniex"],
  "XRP:USD": ["coinbase", "kraken", "whitebit"],
  "XRP:USDT": ["kucoin", "bitrue", "gate", "okx", "xt", "poloniex", "whitebit", "mexc", "kraken", "coinbase"],
};

const publisherRadios = document.getElementById("publisher-radios");
const commitBtn = document.getElementById("commit-btn");
const commitList = document.getElementById("commit-list");
const refreshBtn = document.getElementById("refresh");
const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");

let publishers = []; // [{name, path}]
let currentPublisher = null;
let currentSha = null;

refreshBtn.addEventListener("click", loadPublishers);
commitBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  commitList.classList.toggle("hidden");
});
// Close the commit list when clicking outside
document.addEventListener("click", (e) => {
  if (!commitList.contains(e.target) && !commitBtn.contains(e.target)) {
    commitList.classList.add("hidden");
  }
});

function setStatus(message, kind) {
  statusEl.textContent = message;
  statusEl.className = "status " + (kind || "");
  statusEl.classList.remove("hidden");
}

function clearStatus() {
  statusEl.classList.add("hidden");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : text;
  return div.innerHTML;
}

// sigfig matching utilities.sigfig(number, n)
function sigfig(number, n) {
  if (number == null || number === -1) return null;
  if (number === 0) return 0;
  const d = n - Math.floor(Math.log10(Math.abs(number))) - 1;
  const factor = Math.pow(10, d);
  return Math.round(number * factor) / factor;
}

function fmtNum(n) {
  if (n === null || n === undefined) return "—";
  if (typeof n === "number") return Number.isFinite(n) ? n.toString() : "—";
  return String(n);
}

function ageBadge(unix) {
  const now = Math.floor(Date.now() / 1000);
  const age = now - unix;
  const span = document.createElement("span");
  if (age > STALE_SECONDS) {
    span.className = "stale";
    span.textContent = `STALE: ${Math.round(age / 60)} minutes old (limit ${STALE_SECONDS / 60}m).`;
  } else {
    span.className = "fresh";
    span.textContent = `Published ${Math.round(age / 60)} minutes ago.`;
  }
  return span;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}

async function loadPublishers() {
  clearStatus();
  outputEl.innerHTML = "";
  commitBtn.textContent = "Select a publisher first";
  commitBtn.disabled = true;
  commitList.innerHTML = "";
  commitList.classList.add("hidden");
  currentPublisher = null;
  currentSha = null;

  refreshBtn.disabled = true;
  refreshBtn.textContent = "Loading…";
  publisherRadios.innerHTML = "<span>Loading publishers…</span>";
  publisherRadios.disabled = true;

  try {
    const contents = await fetchJson(`${API_BASE}/contents/?ref=main`);
    publishers = contents
      .filter((f) => f.type === "file" && f.name.endsWith(".json"))
      .map((f) => ({ name: f.name.replace(/\.json$/, ""), path: f.path }))
      .sort((a, b) => a.name.localeCompare(b.name));

    publisherRadios.innerHTML = "";
    const radioGroup = document.getElementById("publisher-radios");
    radioGroup.innerHTML = "";
    for (const p of publishers) {
      const id = "publisher-" + p.name.replace(/[^a-z0-9]/gi, "-");
      const wrap = document.createElement("label");
      wrap.className = "radio-label";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "publisher";
      input.value = p.name;
      input.id = id;
      if (publishers.indexOf(p) === 0) input.checked = true;
      const span = document.createElement("span");
      span.textContent = p.name;
      wrap.appendChild(input);
      wrap.appendChild(span);
      radioGroup.appendChild(wrap);
    }
    // select the first publisher by default and load its snapshots
    const firstInput = radioGroup.querySelector('input[type="radio"]');
    if (firstInput) {
      firstInput.checked = true;
      currentPublisher = firstInput.value;
      onPublisherChange();
    }
    radioGroup.addEventListener("change", onPublisherChange);
    setStatus(`Found ${publishers.length} publisher${publishers.length !== 1 ? "s" : ""}.`, "ok");
  } catch (error) {
    publisherRadios.innerHTML = "<span style='color:#f66'>Failed to load publishers</span>";
    setStatus(`Failed to load publishers: ${escapeHtml(error.message)}`, "err");
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Refresh publisher list";
  }
}

async function onPublisherChange() {
  const checked = document.querySelector('input[name="publisher"]:checked');
  const name = checked ? checked.value : "";
  if (!name) {
    commitBtn.textContent = "Select a publisher first";
    commitBtn.disabled = true;
    commitList.innerHTML = "";
    commitList.classList.add("hidden");
    currentPublisher = null;
    currentSha = null;
    outputEl.innerHTML = "";
    clearStatus();
    return;
  }

  currentPublisher = name;
  clearStatus();
  outputEl.innerHTML = "";
  commitBtn.disabled = true;
  commitBtn.textContent = "Loading snapshots…";
  commitList.innerHTML = "";
  commitList.classList.add("hidden");

  try {
    const commits = await fetchJson(`${API_BASE}/commits?path=${encodeURIComponent(name)}.json`);
    commitBtn.disabled = false;
    // Auto-load the latest snapshot
    if (commits && commits.length) {
      commitBtn.textContent = `${new Date(commits[0].commit.author.date).toLocaleString()}  (${commits[0].sha.slice(0, 7)})`;
      currentSha = commits[0].sha;
      await loadSnapshotAt(currentSha);
    } else {
      commitBtn.textContent = "No snapshots";
    }
    // Build the commit list
    commitList.innerHTML = "";
    if (commits && commits.length) {
      for (const c of commits) {
        const date = new Date(c.commit.author.date).toLocaleString();
        const item = document.createElement("button");
        item.type = "button";
        item.className = "commit-item";
        item.dataset.sha = c.sha;
        item.textContent = `${date}  (${c.sha.slice(0, 7)})`;
        if (c.sha === currentSha) item.classList.add("selected");
        item.addEventListener("click", () => {
          currentSha = c.sha;
          commitBtn.textContent = `${date}  (${c.sha.slice(0, 7)})`;
          commitList.classList.add("hidden");
          // update selected highlight
          [...commitList.querySelectorAll(".commit-item")].forEach((el) =>
            el.classList.toggle("selected", el.dataset.sha === c.sha)
          );
          loadSnapshotAt(c.sha);
        });
        commitList.appendChild(item);
      }
    } else {
      const empty = document.createElement("div");
      empty.className = "commit-item";
      empty.textContent = "No snapshots";
      empty.style.color = "#666";
      empty.style.cursor = "default";
      commitList.appendChild(empty);
    }
  } catch (error) {
    commitBtn.textContent = "Failed to load snapshots";
    setStatus(`Failed to load snapshots: ${escapeHtml(error.message)}`, "err");
  }
}

async function loadSnapshotAt(sha) {
  currentSha = sha || null;
  if (!currentPublisher) return;

  clearStatus();
  outputEl.innerHTML = "";

  const url = sha
    ? `${RAW_BASE}${sha}/${encodeURIComponent(currentPublisher)}.json`
    : `${RAW_BASE}${encodeURIComponent(currentPublisher)}.json`;

  try {
    const snapshot = await fetchJson(url);
    renderPublisher(snapshot);
  } catch (error) {
    outputEl.innerHTML = `<p class="missing">Failed to load snapshot: ${escapeHtml(error.message)}</p>`;
    setStatus(`Snapshot load failed: ${escapeHtml(error.message)}`, "err");
  }
}

function renderPublisher(snapshot) {
  const account = snapshot && snapshot.account ? snapshot.account : currentPublisher;
  const version = snapshot && snapshot.version ? snapshot.version : null;
  const prices = snapshot && snapshot.prices ? snapshot.prices : {};
  const time = prices.time || {};
  const feed = prices.feed || {};
  const inverse = prices.inverse || {};
  const cex = prices.cex || {};
  const dex = prices.dex || {};
  const forex = prices.forex || {};

  const card = document.createElement("article");
  card.className = "publisher-card";

  const head = document.createElement("header");
  const h2 = document.createElement("h2");
  h2.textContent = escapeHtml(account);
  head.appendChild(h2);

  const meta = document.createElement("p");
  meta.className = "meta";
  const parts = [];
  if (time && time.unix != null) {
    meta.appendChild(ageBadge(Number(time.unix)));
    meta.appendChild(document.createTextNode("  "));
  }
  if (time.local) parts.push("local: " + escapeHtml(time.local));
  if (time.utc) parts.push("utc: " + escapeHtml(time.utc));
  if (time.updates != null) parts.push("updates: " + time.updates);
  if (time.runtime != null) parts.push("runtime: " + time.runtime + "s");
  if (version) parts.push("version: " + escapeHtml(version));
  if (parts.length) {
    const span = document.createElement("span");
    span.textContent = parts.join("  |  ");
    meta.appendChild(span);
  }
  head.appendChild(meta);
  card.appendChild(head);

  // FINAL FEED (first, most important)
  const finalFeedEl = renderFinalFeedTable(feed);

  // Layout: FINAL FEED on the right of DEX + FOREX on large displays
  const layout = buildLayout(
    finalFeedEl ? renderSection("FINAL FEED", finalFeedEl) : null,
    renderSection("DEX", renderDexTable(dex)),
    renderSection("FOREX / AGGREGATORS", renderForexTable(forex)),
    renderCexTable(cex)
  );
  card.appendChild(layout);

  outputEl.appendChild(card);
  setStatus(`Rendered snapshot for ${escapeHtml(account)}.`, "ok");
}

function wrapTable(table) {
  const wrap = document.createElement("div");
  wrap.className = "table-wrap";
  wrap.appendChild(table);
  return wrap;
}

function renderSection(title, el) {
  const section = document.createElement("section");
  section.className = "section";
  const titleEl = document.createElement("div");
  titleEl.className = "section-title";
  titleEl.textContent = title;
  section.appendChild(titleEl);
  if (el) section.appendChild(el);
  return section;
}

function buildTopRow(finalFeedEl, dexEl, forexEl) {
  const row = document.createElement("div");
  row.className = "tables-row";
  if (finalFeedEl) row.appendChild(finalFeedEl);
  if (dexEl) row.appendChild(dexEl);
  if (forexEl) row.appendChild(forexEl);
  return row;
}

function buildLayout(finalFeedEl, dexEl, forexEl, cexEl) {
  // DEX stacked above FOREX on the left, FINAL FEED to their right,
  // CEX below everything on all screen sizes.
  const left = document.createElement("div");
  left.className = "left-col";
  if (dexEl) left.appendChild(dexEl);
  if (forexEl) left.appendChild(forexEl);

  const top = document.createElement("div");
  top.className = "top-row";
  top.appendChild(left);
  if (finalFeedEl) top.appendChild(finalFeedEl);

  const container = document.createElement("div");
  container.className = "layout-container";
  container.appendChild(top);

  // CEX below everything
  if (cexEl) {
    container.appendChild(cexEl);
  }

  return container;
}

/* ---------------- FINAL FEED ---------------- */

function renderFinalFeedTable(feed) {
  const rows = Object.entries(feed || {})
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([pair, price]) => {
      const tr = document.createElement("tr");
      tr.className = "pair-header";
      tr.innerHTML = `<td class="pair">${escapeHtml(pair)}</td><td class="price cell-cyan">${escapeHtml(fmtNum(sigfig(price, 5)))}</td>`;
      return tr;
    });
  if (rows.length === 0) return null;
  const table = document.createElement("table");
  table.className = "honest final";
  const thead = document.createElement("thead");
  thead.innerHTML = `<th>pair</th><th>price</th>`;
  const tbody = document.createElement("tbody");
  for (const row of rows) tbody.appendChild(row);
  table.appendChild(thead);
  table.appendChild(tbody);
  return wrapTable(table);
}

/* ---------------- DEX ---------------- */

function renderDexTable(dex) {
  const last = dex && dex.last ? dex.last : {};
  const gateways = sortedUniq(Object.keys(last).map((k) => k.split(".")[0]));
  const tokens = sortedUniq(Object.keys(last).map((k) => k.split(".")[1]));

  if (gateways.length === 0 || tokens.length === 0) return null;

  // build matrix: header row = blank + tokens; then gateway rows
  const matrix = [[""].concat(tokens)];
  for (const gateway of gateways) {
    const row = [gateway];
    for (const token of tokens) {
      const key = `${gateway}.${token}`;
      const v = last[key];
      row.push(sigfig(v, 4));
    }
    matrix.push(row);
  }
  // transpose -> tokens become rows, gateways become columns (matches pricefeed_dex.py)
  const transposed = matrix[0].map((_, colIndex) =>
    matrix.map((row) => row[colIndex])
  );

  const table = document.createElement("table");
  table.className = "honest";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `<th></th>${gateways.map((g) => `<th>${escapeHtml(g)}</th>`).join("")}`;
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (const row of transposed) {
    const token = row[0];
    const tr = document.createElement("tr");
    const cells = [`<td class="pair cell-dim">${escapeHtml(token)}</td>`];
    for (let ci = 1; ci < row.length; ci++) {
      const v = row[ci];
      const num = sigfig(v, 4);
      let cls = "cell-yellow";
      if (v != null && v !== -1) cls = "cell-green";
      cells.push(`<td class="price ${cls}">${escapeHtml(fmtNum(num))}</td>`);
    }
    tr.innerHTML = cells.join("");
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return wrapTable(table);
}

/* ---------------- CEX ---------------- */

function renderCexTable(cex) {
  if (!cex || Object.keys(cex).length === 0) return null;

  const pairs = Object.keys(cex).sort();
  const quotes = ["BTC", "USD", "USDT"];

  const container = document.createElement("div");
  container.style.display = "block";
  container.style.gap = "12px";

  for (const quote of quotes) {
    const quotePairs = pairs.filter((p) => p.endsWith(":" + quote));
    if (quotePairs.length === 0) continue;

    // collect exchanges for this quote base (excluding _implied)
    const exchanges = new Set();
    for (const pair of quotePairs) {
      const data = cex[pair];
      if (data && data.data) {
        for (const ex of Object.keys(data.data)) {
          if (!ex.endsWith("_implied")) exchanges.add(ex);
        }
      }
    }
    const sortedEx = [...exchanges].sort();
    if (sortedEx.length === 0) continue;

    // build matrix: header row = blank + pairs/assets
    // each data row = exchange name + prices per pair
    // last row = median + median per pair
    const nPrices = [];
    for (const pair of quotePairs) {
      const data = cex[pair];
      nPrices.push(
        Object.values(data && data.data ? data.data : {}).filter(
          (v) => v != null && v !== -1
        ).length - 1
      );
    }

    const exSection = document.createElement("section");
    exSection.className = "section";
    const title = document.createElement("div");
    title.className = "section-title";
    title.textContent = `${quote} BASE`;
    exSection.appendChild(title);

    const table = document.createElement("table");
    table.className = "honest";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.innerHTML = `<th></th>${quotePairs
      .map((pair, idx) => {
        const count = nPrices[idx] || 0;
        let cls = "cell-cyan";
        if (count >= 7) cls = "cell-white";
        else if (count >= 5) cls = "cell-yellow";
        else if (count >= 2) cls = "cell-red";
        return `<th class="${cls}">${escapeHtml(pair)}</th>`;
      })
      .join("")}`;
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    // exchange rows
    for (const ex of sortedEx) {
      const cells = [`<td class="pair cell-dim">${escapeHtml(ex)}</td>`];
      for (const pair of quotePairs) {
        const data = cex[pair];
        const v = data && data.data ? data.data[ex] : -1;
        let cls;
        if (v != null && v !== -1) cls = "cell-green";
        else cls = "cell-yellow";
        cells.push(`<td class="price ${cls}">${escapeHtml(fmtNum(sigfig(v, 4)))}</td>`);
      }
      const tr = document.createElement("tr");
      tr.innerHTML = cells.join("");
      tbody.appendChild(tr);
    }

    // median row
    const medianCells = [`<td class="pair cell-purple">median</td>`];
    for (const pair of quotePairs) {
      const data = cex[pair];
      const v = data && data.median != null ? data.median : -1;
      let cls;
      if (v != null && v !== -1) cls = "cell-cyan";
      else cls = "cell-yellow";
      medianCells.push(`<td class="price ${cls}">${escapeHtml(fmtNum(sigfig(v, 4)))}</td>`);
    }
    const medianTr = document.createElement("tr");
    medianTr.innerHTML = medianCells.join("");
    tbody.appendChild(medianTr);

    table.appendChild(tbody);
    exSection.appendChild(wrapTable(table));
    container.appendChild(exSection);
  }

  return container;
}

/* ---------------- FOREX ---------------- */

function renderForexTable(forex) {
  if (!forex || !forex.aggregate || Object.keys(forex.aggregate).length === 0) return null;

  const aggregate = forex.aggregate;
  const medians = forex.medians || {};
  const pairs = Object.keys(aggregate).sort();

  // collect all sources
  const sources = new Set();
  for (const entries of Object.values(aggregate)) {
    for (const entry of entries) {
      if (entry && entry[1]) sources.add(entry[1]);
    }
  }
  const sortedSources = [...sources].sort();

  // matrix: rows = sources + median, columns = pairs
  const rows = [];
  for (const src of sortedSources) {
    const row = [src];
    for (const pair of pairs) {
      const entries = aggregate[pair] || [];
      const found = entries.find((e) => e && e[1] === src);
      row.push(found ? found[0] : -1);
    }
    rows.push(row);
  }
  const medianRow = ["median"];
  for (const pair of pairs) {
    medianRow.push(medians[pair] && medians[pair][0] != null ? medians[pair][0] : -1);
  }
  rows.push(medianRow);

  const nPrices = pairs.map((pair) => (medians[pair] ? medians[pair][1] : 0));

  const table = document.createElement("table");
  table.className = "honest";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headerRow.innerHTML = `<th></th>${pairs
    .map(
      (pair, idx) => {
        const count = nPrices[idx] || 0;
        let cls = "cell-cyan";
        if (count >= 7) cls = "cell-white";
        else if (count >= 5) cls = "cell-yellow";
        else if (count >= 2) cls = "cell-red";
        return `<th class="${cls}">${escapeHtml(pair)}</th>`;
      }
    )
    .join("")}`;
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (let rdx = 0; rdx < rows.length; rdx++) {
    const row = rows[rdx];
    const srcName = row[0];
    const isMedian = rdx >= sortedSources.length;
    const cells = [
      `<td class="pair ${isMedian ? "cell-purple" : "cell-dim"}">${escapeHtml(srcName)}</td>`,
    ];
    for (let idx = 0; idx < pairs.length; idx++) {
      const v = row[idx + 1];
      let cls;
      if (isMedian) cls = "cell-cyan";
      else if (v != null && v !== -1) cls = "cell-green";
      else cls = "cell-yellow";
      cells.push(`<td class="price ${cls}">${escapeHtml(fmtNum(sigfig(v, 4)))}</td>`);
    }
    const tr = document.createElement("tr");
    tr.innerHTML = cells.join("");
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  return wrapTable(table);
}

function sortedUniq(arr) {
  return [...new Set(arr)].sort();
}

// Kick off
loadPublishers();
