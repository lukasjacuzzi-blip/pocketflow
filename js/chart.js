/**
 * Zeichnet das interaktive Ausgaben-Donut-Diagramm auf einem Retina-Canvas
 * und aktualisiert die Kategorie-Legende.
 */

export function renderExpenseDonut(canvas, legendEl, categoryTotals, formatCurrencyFn) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const size = 160;

  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const cx = size / 2;
  const cy = size / 2;
  const radius = 62;
  const lineWidth = 20;

  ctx.clearRect(0, 0, size, size);

  const total = categoryTotals.reduce((sum, item) => sum + item.total, 0);

  if (total <= 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    if (legendEl) {
      legendEl.innerHTML = '<li class="muted-label">Noch keine Ausgaben in diesem Monat.</li>';
    }
    return;
  }

  let startAngle = -Math.PI / 2;
  const gapAngle = categoryTotals.length > 1 ? 0.04 : 0;

  categoryTotals.forEach((item) => {
    const sliceAngle = (item.total / total) * Math.PI * 2;
    const drawAngle = Math.max(0.02, sliceAngle - gapAngle);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, startAngle + drawAngle);
    ctx.strokeStyle = item.color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();

    startAngle += sliceAngle;
  });

  if (legendEl) {
    legendEl.innerHTML = categoryTotals
      .slice(0, 5)
      .map((item) => {
        const pct = Math.round((item.total / total) * 100);
        return (
          '<li class="legend-item">' +
            '<div class="legend-left">' +
              '<span class="legend-dot" style="background:' + item.color + '"></span>' +
              '<span>' + item.icon + ' ' + item.label + ' (' + pct + '%)</span>' +
            '</div>' +
            '<strong class="money-val">' + formatCurrencyFn(item.total) + '</strong>' +
          '</li>'
        );
      })
      .join('');
  }
}
