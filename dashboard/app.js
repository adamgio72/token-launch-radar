// Token Launch Radar — the board, the filters and the detail drawer.
// Everything renders from window.RADAR (data.js, written by main.ts from the same board).
// No fetch, no network, no framework: the page is a static file that reads its own dataset.
(function () {
  'use strict';
  var D = window.RADAR;
  var rowsEl = document.getElementById('rows');
  var liveRowsEl = document.getElementById('liveRows');
  var countEl = document.getElementById('count');
  var boardWrap = document.getElementById('boardWrap');
  var liveSec = document.getElementById('liveSec');
  var drawer = document.getElementById('drawer');
  var drawerBody = document.getElementById('drawerBody');
  var backdrop = document.getElementById('backdrop');
  var state = { view: 'all', q: '', cat: '', sort: 'implied' };
  var current = null;

  if (!D || !Array.isArray(D.rows)) {
    document.getElementById('subtitle').textContent = 'No dataset found: this page needs data.js beside it.';
    return;
  }

  // A row is a watchlist row when the model marked it so: the flag rides on the row itself.
  function isWatch(r) { return r.on_watchlist === true; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmtUsd(n) {
    if (n == null || !isFinite(n)) return '—';
    var a = Math.abs(n);
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + Math.round(n);
  }
  function fmtPct(n) {
    if (n == null || !isFinite(n)) return '—';
    var cls = n > 0 ? 'up' : n < 0 ? 'down' : '';
    var sign = n > 0 ? '+' : '';
    return '<span class="' + cls + '">' + sign + n.toFixed(1) + '%</span>';
  }
  function fmtMult(n) { return n == null ? '—' : n.toFixed(3); }
  function fmtAge(n) { return n == null ? '—' : n + 'd'; }
  function chainsOf(r) { return r.chains && r.chains.length ? r.chains.slice(0, 2).join(', ') : '—'; }

  function init() {
    document.getElementById('subtitle').textContent =
      'Snapshot ' + D.as_of + ' · ' + D.board_size + ' pre-token protocols ranked · model ' + D.model_version +
      ' · every row records no token, never claims to have none';
    document.getElementById('badges').innerHTML =
      '<div><dt>Watchlist</dt><dd class="amber">' + D.watchlist_size + '</dd></div>' +
      '<div><dt>Early radar</dt><dd>' + D.early_size + '</dd></div>' +
      '<div><dt>Live set aside</dt><dd>' + D.live_size + '</dd></div>';
    var cats = {};
    D.rows.forEach(function (r) { if (r.category) cats[r.category] = true; });
    var sel = document.getElementById('cat');
    Object.keys(cats).sort().forEach(function (c) {
      var o = document.createElement('option');
      o.value = c; o.textContent = c;
      sel.appendChild(o);
    });
    document.querySelectorAll('#chips button').forEach(function (b) {
      var v = b.getAttribute('data-view');
      var n = v === 'all' ? D.board_size : v === 'watchlist' ? D.watchlist_size : v === 'early' ? D.early_size : D.live_size;
      b.textContent = b.textContent + ' ' + n;
      b.addEventListener('click', function () {
        state.view = v;
        document.querySelectorAll('#chips button').forEach(function (x) { x.classList.toggle('on', x === b); });
        render();
      });
    });
    document.getElementById('q').addEventListener('input', function (e) { state.q = e.target.value.trim().toLowerCase(); render(); });
    sel.addEventListener('change', function (e) { state.cat = e.target.value; render(); });
    document.getElementById('sort').addEventListener('change', function (e) { state.sort = e.target.value; render(); });
    document.getElementById('closeDrawer').addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
    rowsEl.addEventListener('click', function (e) {
      var tr = e.target.closest('tr[data-slug]');
      if (tr) openDrawer(tr.getAttribute('data-slug'));
    });
    document.getElementById('methodText').textContent =
      'Model ' + D.model_version + '. Each category’s multiple is the median market-cap-to-TVL ratio of that category’s live-token protocols in this very snapshot — at least ' +
      D.model.min_samples + ' of them, or the overall median ' + D.overall_multiple.toFixed(3) + ' when a category has fewer. ' +
      'Implied value = TVL × multiple × growth × maturity, capped at ' + D.model.multiple_cap.toFixed(1) +
      '× so no token is ever valued above the value locked in its own protocol. ' +
      'Growth is the 7-day TVL change clamped to ' + D.model.growth_floor + '…+' + D.model.growth_cap +
      '%; maturity grows from ' + D.model.maturity_floor + ' to 1.0 over ' + D.model.maturity_days +
      ' days. Snapshot: ' + D.source + ', as of ' + D.as_of + ', floor $' + D.floor_usd.toLocaleString('en-US') + '.';
    render();
  }

  function filtered() {
    var list = D.rows.filter(function (r) {
      if (state.view === 'watchlist' && !isWatch(r)) return false;
      if (state.view === 'early' && isWatch(r)) return false;
      if (state.cat && r.category !== state.cat) return false;
      if (state.q) {
        var hay = (r.name + ' ' + r.slug + ' ' + (r.category || '')).toLowerCase();
        if (hay.indexOf(state.q) === -1) return false;
      }
      return true;
    });
    var byRank = function (a, b) { return a.rank - b.rank; };
    if (state.sort === 'tvl') list.sort(function (a, b) { return b.tvl_usd - a.tvl_usd || byRank(a, b); });
    else if (state.sort === 'growth') list.sort(function (a, b) { return (b.change_7d == null ? -1e9 : b.change_7d) - (a.change_7d == null ? -1e9 : a.change_7d) || byRank(a, b); });
    else if (state.sort === 'age') list.sort(function (a, b) { return (b.age_days == null ? -1 : b.age_days) - (a.age_days == null ? -1 : a.age_days) || byRank(a, b); });
    else list.sort(byRank);
    return list;
  }

  function render() {
    if (state.view === 'live') {
      boardWrap.hidden = true;
      liveSec.hidden = false;
      countEl.textContent = D.live_size + ' live-token protocols — the comparables behind the model.';
      liveRowsEl.innerHTML = D.live.map(function (p) {
        var ratio = p.mcap_usd != null && p.tvl_usd > 0 ? (p.mcap_usd / p.tvl_usd).toFixed(3) : '—';
        return '<tr><td><span class="name">' + esc(p.name) + '</span> <span class="slug">' + esc(p.slug) + '</span></td>' +
          '<td>' + esc(p.category || '—') + '</td>' +
          '<td class="num">' + fmtUsd(p.tvl_usd) + '</td>' +
          '<td class="num">' + fmtUsd(p.mcap_usd) + '</td>' +
          '<td class="num">' + ratio + '</td>' +
          '<td class="num">' + fmtPct(p.change_7d) + '</td></tr>';
      }).join('');
      return;
    }
    boardWrap.hidden = false;
    liveSec.hidden = true;
    var list = filtered();
    countEl.textContent = list.length + ' of ' + D.board_size + ' protocols' +
      (state.view === 'watchlist' ? ' on the watchlist' : state.view === 'early' ? ' on the early radar' : '') +
      (state.cat ? ' · ' + state.cat : '') + (state.q ? ' · matching “' + state.q + '”' : '');
    rowsEl.innerHTML = list.map(function (r) {
      var tag = isWatch(r) ? '<span class="tag">Watchlist</span>' : '<span class="tag early">Early</span>';
      return '<tr data-slug="' + esc(r.slug) + '">' +
        '<td class="num">' + r.rank + '</td>' +
        '<td><span class="name">' + esc(r.name) + '</span>' + tag + '<br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td>' +
        '<td>' + esc(chainsOf(r)) + '</td>' +
        '<td class="num">' + fmtUsd(r.tvl_usd) + '</td>' +
        '<td class="num">' + fmtPct(r.change_7d) + '</td>' +
        '<td class="num strong">' + fmtUsd(r.implied_value_usd) + '</td>' +
        '<td class="num">' + fmtMult(r.model.category_multiple) + '</td></tr>';
    }).join('') || '<tr><td colspan="8">Nothing matches — clear the search or the category filter.</td></tr>';
  }

  function openDrawer(slug) {
    var r = null;
    D.rows.forEach(function (x) { if (x.slug === slug) r = x; });
    if (!r) return;
    current = r;
    var m = r.model;
    var multNote = m.category_fallback
      ? 'Overall median ' + m.category_multiple.toFixed(3) + ' — fewer than ' + D.model.min_samples + ' live-token protocols in “' + esc(r.category || 'uncategorised') + '”, so the category has no multiple of its own.'
      : 'Median of ' + m.category_samples + ' live-token protocols in “' + esc(r.category || 'uncategorised') + '”.';
    drawerBody.innerHTML =
      '<h2>' + esc(r.name) + '</h2><span class="slug">' + esc(r.slug) + ' · rank #' + r.rank + (isWatch(r) ? ' · Watchlist' : ' · Early radar') + '</span>' +
      '<p class="big-label">Implied launch value</p><p class="big">' + fmtUsd(r.implied_value_usd) + '</p>' +
      '<p class="big-label">How the value is built</p><dl class="kv">' +
      '<dt>TVL</dt><dd>' + fmtUsd(r.tvl_usd) + '</dd>' +
      '<dt>Category multiple</dt><dd>' + m.category_multiple.toFixed(3) + '</dd>' +
      '<dt>7-day growth</dt><dd>' + fmtPct(r.change_7d) + ' → ×' + m.growth_multiplier.toFixed(3) + '</dd>' +
      '<dt>Maturity</dt><dd>' + fmtAge(r.age_days) + ' → ×' + m.maturity_multiplier.toFixed(3) + '</dd>' +
      '<dt>Chains</dt><dd>' + esc(chainsOf(r)) + '</dd>' +
      '<dt>Category</dt><dd>' + esc(r.category || '—') + '</dd></dl>' +
      '<p class="note">' + multNote + '</p>' +
      '<p class="big-label">Farm plan — six steps</p><ol class="steps">' +
      r.farm_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>' +
      '<p class="note">This row records no token in the snapshot. That is not a claim that no token exists: a parent protocol can hold it and stay invisible here. The farm plan is a model’s reading of this protocol’s own record — check the protocol’s own page before you move funds.</p>';
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.hidden = false;
  }

  function closeDrawer() {
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.hidden = true;
    current = null;
  }

  init();
})();
