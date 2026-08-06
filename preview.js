// Preview-only interactivity: theme toggle + live column-width adjusters.
// Does not touch app source — purely drives the hand-written markup in index.html.
(function () {
  'use strict';

  // ---------- theme toggle ----------
  var body = document.body;
  var themeToggle = document.getElementById('themeToggle');
  var themeLabel = document.getElementById('themeLabel');
  var themeIcon = document.getElementById('themeIcon');

  function setTheme(theme) {
    body.dataset.theme = theme;
    themeLabel.textContent = theme.toUpperCase();
    themeIcon.textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
    // card width is per-theme too (dark loses ~7px to the scrollbar gutter) — reapply.
    applyCardWidths();
  }
  themeToggle.addEventListener('click', function () {
    setTheme(body.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  // ---------- viewport selector ----------
  // Real-app card-width sweep supplied by the coordinator (VITE_DEMO_MODE=true,
  // 2-col dashboard layout) — do NOT re-measure, use verbatim.
  var VIEWPORT_CARD_WIDTHS = {
    1280: { light: 474, dark: 467 },
    1440: { light: 554, dark: 547 },
    1600: { light: 634, dark: 627 },
    1680: { light: 674, dark: 667 },
    1920: { light: 794, dark: 787 },
    2560: { light: 1114, dark: 1107 },
  };
  var VIEWPORTS = [1280, 1440, 1600, 1680, 1920, 2560];
  var currentViewport = 1920;

  var viewportSwitchEl = document.getElementById('viewportSwitch');
  var viewportButtons = {};
  VIEWPORTS.forEach(function (vp) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'layout-switch__opt';
    btn.textContent = vp;
    btn.addEventListener('click', function () {
      currentViewport = vp;
      applyCardWidths();
    });
    viewportSwitchEl.appendChild(btn);
    viewportButtons[vp] = btn;
  });

  var widthReadoutEl = document.getElementById('widthReadout');

  function applyCardWidths() {
    var theme = body.dataset.theme === 'light' ? 'light' : 'dark';
    var cardW = VIEWPORT_CARD_WIDTHS[currentViewport][theme];

    VIEWPORTS.forEach(function (vp) {
      viewportButtons[vp].classList.toggle('is-active', vp === currentViewport);
    });

    document.querySelectorAll('.pv-card, .pv-adjust').forEach(function (el) {
      el.style.width = cardW + 'px';
    });

    // recomputeAll() re-renders adjuster px readouts against the new table.clientWidth;
    // it also gives us a live-measured table width (post layout+padding) for the readout,
    // more accurate than "cardWidth - 48" since light/dark padding differ (48px vs 44px).
    recomputeAll();

    var t1 = document.getElementById('t1after');
    var tableW = t1 ? t1.getBoundingClientRect().width : null;
    widthReadoutEl.innerHTML =
      '표 폭: <strong>' + (tableW != null ? Math.round(tableW * 10) / 10 : '—') + 'px</strong>' +
      ' (카드 ' + cardW + 'px · ' + currentViewport + ' · ' + theme + ')';
  }

  // ---------- adjuster config ----------
  // reqPx values are the dark-theme "요구 px" hard/soft minimums from colwidth-spec.md §표1~3.
  var TABLES = [
    {
      containerId: 't1adjust',
      tableId: 't1after',
      idPrefix: 't1after',
      columns: [
        { key: 'col-line', label: 'Line', defaultPct: 6, reqPx: 106, hard: false },
        { key: 'col-lot-id', label: 'Lot ID', defaultPct: 10, reqPx: 109, hard: true },
        { key: 'col-process', label: 'Step', defaultPct: 12, reqPx: 165, hard: false },
        { key: 'col-comment', label: 'Reason', defaultPct: 22, reqPx: 76, hard: true },
        { key: 'col-hold-at', label: 'Hold 발생시각', defaultPct: 27, reqPx: 113, hard: true },
        { key: 'col-holdtime', label: 'Holdtime', defaultPct: 23, reqPx: 93, hard: true },
      ],
    },
    {
      containerId: 't2adjust',
      tableId: 't2after',
      idPrefix: 't2after',
      columns: [
        { key: 'col-line', label: 'Line', defaultPct: 5, reqPx: 66, hard: false },
        { key: 'col-lot-id', label: 'Lot ID', defaultPct: 8, reqPx: 88, hard: true },
        { key: 'col-process', label: 'Step', defaultPct: 7, reqPx: 159, hard: false },
        { key: 'col-operator', label: '담당자', defaultPct: 7, reqPx: 139, hard: false },
        { key: 'col-comment', label: 'Reason', defaultPct: 23, reqPx: 76, hard: true },
        { key: 'col-hold-at', label: 'Hold 발생시각', defaultPct: 27, reqPx: 113, hard: true },
        { key: 'col-holdtime', label: 'Holdtime', defaultPct: 23, reqPx: 93, hard: true },
      ],
    },
    {
      containerId: 't3adjust',
      tableId: 't3after',
      idPrefix: 't3after',
      columns: [
        { key: 'col-line', label: 'Line', defaultPct: 5, reqPx: 66, hard: false },
        { key: 'col-lot-id', label: 'Lot ID', defaultPct: 5, reqPx: 62, hard: true },
        { key: 'col-process', label: 'Step', defaultPct: 7, reqPx: 165, hard: false },
        { key: 'col-owner', label: '담당자(구 이름)', defaultPct: 6, reqPx: 80, hard: true },
        { key: 'col-comment', label: 'Reason', defaultPct: 27, reqPx: 284, hard: false },
        { key: 'col-hold-at', label: 'Hold 발생시각', defaultPct: 27, reqPx: 113, hard: true },
        { key: 'col-holdtime', label: 'Holdtime', defaultPct: 23, reqPx: 93, hard: true },
      ],
    },
  ];

  var instances = [];

  function buildAdjuster(cfg) {
    var container = document.getElementById(cfg.containerId);
    var table = document.getElementById(cfg.tableId);
    if (!container || !table) return null;

    var head = document.createElement('div');
    head.className = 'pv-adjust__head';
    var sumEl = document.createElement('span');
    sumEl.className = 'pv-adjust__sum';
    var resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'pv-adjust__reset';
    resetBtn.textContent = '초기값으로';
    head.appendChild(sumEl);
    head.appendChild(resetBtn);
    container.appendChild(head);

    var legend = document.createElement('div');
    legend.className = 'pv-adjust__row';
    legend.style.borderBottom = '1px solid var(--rule)';
    legend.innerHTML =
      '<span class="pv-adjust__label" style="color:var(--ink-mute)">컬럼</span>' +
      '<span class="pv-adjust__label" style="color:var(--ink-mute)">%</span>' +
      '<span class="pv-adjust__label" style="color:var(--ink-mute)">폭 슬라이더</span>' +
      '<span class="pv-adjust__label" style="color:var(--ink-mute);text-align:right">현재px</span>' +
      '<span class="pv-adjust__label" style="color:var(--ink-mute);text-align:right">요구px</span>';
    container.appendChild(legend);

    var rows = cfg.columns.map(function (col) {
      var colEl = document.getElementById(cfg.idPrefix + '-' + col.key);

      var row = document.createElement('div');
      row.className = 'pv-adjust__row';

      var label = document.createElement('span');
      label.className = 'pv-adjust__label' + (col.hard ? ' is-hard' : '');
      label.textContent = col.label;
      label.title = col.hard ? '하드 하한(잘리면 의미가 깨짐)' : '말줄임 허용';

      var numInput = document.createElement('input');
      numInput.type = 'number';
      numInput.className = 'pv-adjust__input';
      numInput.min = '0';
      numInput.max = '100';
      numInput.step = '0.1';
      numInput.value = col.defaultPct;

      var slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'pv-adjust__slider';
      slider.min = '0';
      slider.max = '50';
      slider.step = '0.1';
      slider.value = col.defaultPct;

      var pxEl = document.createElement('span');
      pxEl.className = 'pv-adjust__px is-cur';

      var reqEl = document.createElement('span');
      reqEl.className = 'pv-adjust__req';
      reqEl.textContent = col.reqPx + 'px';

      row.appendChild(label);
      row.appendChild(numInput);
      row.appendChild(slider);
      row.appendChild(pxEl);
      row.appendChild(reqEl);
      container.appendChild(row);

      function syncFromNumber() {
        var v = parseFloat(numInput.value);
        if (isNaN(v)) v = 0;
        slider.value = v;
        recompute();
      }
      function syncFromSlider() {
        numInput.value = slider.value;
        recompute();
      }
      numInput.addEventListener('input', syncFromNumber);
      slider.addEventListener('input', syncFromSlider);

      return { col: col, colEl: colEl, numInput: numInput, slider: slider, pxEl: pxEl, row: row };
    });

    var legendNote = document.createElement('div');
    legendNote.className = 'pv-adjust__legend';
    legendNote.textContent = '* 표시 = 하드 하한(잘리면 의미가 깨짐). 요구px는 dark 기준(스펙 정본).';
    container.appendChild(legendNote);

    function recompute() {
      var tableWidth = table.clientWidth;
      var sum = 0;
      rows.forEach(function (r) {
        var pct = parseFloat(r.numInput.value) || 0;
        sum += pct;
        if (r.colEl) r.colEl.style.width = pct + '%';
        var px = (tableWidth * pct) / 100;
        r.pxEl.textContent = px.toFixed(1) + 'px';
        var warn = px < r.col.reqPx - 0.5;
        r.pxEl.classList.toggle('is-warn', warn);
        r.row.style.background = warn ? 'var(--hold-soft)' : '';
      });
      sumEl.textContent = '합계 ' + sum.toFixed(1) + '%';
      sumEl.classList.toggle('is-bad', Math.abs(sum - 100) > 0.05);
      if (Math.abs(sum - 100) > 0.05) {
        sumEl.textContent += ' — 100%가 아닙니다';
      }
    }

    resetBtn.addEventListener('click', function () {
      rows.forEach(function (r) {
        r.numInput.value = r.col.defaultPct;
        r.slider.value = r.col.defaultPct;
      });
      recompute();
    });

    recompute();
    return { recompute: recompute };
  }

  function recomputeAll() {
    instances.forEach(function (inst) {
      if (inst) inst.recompute();
    });
  }

  TABLES.forEach(function (cfg) {
    instances.push(buildAdjuster(cfg));
  });

  // Apply the default viewport (1920) + default theme (dark) card widths now that
  // both the adjusters and the viewport switch exist.
  applyCardWidths();

  window.addEventListener('resize', recomputeAll);
  // initial paint can happen before web fonts finish loading, which shifts clientWidth
  // (Monoplex KR vs fallback). Recompute once fonts are ready so px readouts are accurate.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(applyCardWidths);
  }
})();
