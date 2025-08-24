// Lightweight SVG charts: bar (current posterior) and line (timeline)
// Exports: Charts

function clear(el) { while (el.firstChild) el.removeChild(el.firstChild); }

function createSvg(width, height) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  return svg;
}

function clamp01(x) { return Math.max(0, Math.min(1, x)); }

export const Charts = {
  drawBar(container, labels, values, colors, format) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    clear(el);
    const W = 600, H = 240, pad = 28;
    const svg = createSvg(W, H);
    const n = values.length;
    const max = Math.max(...values, 1);
    const barW = (W - pad * 2) / (n || 1);

    // axes
    const axis = document.createElementNS(svg.namespaceURI, 'line');
    axis.setAttribute('x1', pad);
    axis.setAttribute('y1', H - pad);
    axis.setAttribute('x2', W - pad);
    axis.setAttribute('y2', H - pad);
    axis.setAttribute('stroke', '#9aa4b2');
    axis.setAttribute('stroke-width', '1');
    svg.appendChild(axis);

    for (let i = 0; i < n; i++) {
      const v = values[i];
      const h = (H - pad * 2) * (v / max);
      const x = pad + i * barW + 8;
      const y = H - pad - h;
      const rect = document.createElementNS(svg.namespaceURI, 'rect');
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', Math.max(4, barW - 16));
      rect.setAttribute('height', Math.max(0, h));
      rect.setAttribute('fill', colors[i % colors.length] || '#2a6df4');
      svg.appendChild(rect);

      const label = document.createElementNS(svg.namespaceURI, 'text');
      label.setAttribute('x', x + Math.max(4, barW - 16) / 2);
      label.setAttribute('y', H - pad + 14);
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('font-size', '10');
      label.textContent = labels[i];
      svg.appendChild(label);

      const val = document.createElementNS(svg.namespaceURI, 'text');
      val.setAttribute('x', x + Math.max(4, barW - 16) / 2);
      val.setAttribute('y', y - 4);
      val.setAttribute('text-anchor', 'middle');
      val.setAttribute('font-size', '10');
      val.textContent = format ? format(v) : v.toFixed(2);
      svg.appendChild(val);
    }

    el.appendChild(svg);
  },

  drawLine(container, labels, timeline, colors, format) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    clear(el);
    const W = 600, H = 240, pad = 28;
    const svg = createSvg(W, H);

    const steps = timeline.length;
    const n = labels.length;
    const maxY = 1; // probabilities in [0,1]

    // axes
    const xAxis = document.createElementNS(svg.namespaceURI, 'line');
    xAxis.setAttribute('x1', pad);
    xAxis.setAttribute('y1', H - pad);
    xAxis.setAttribute('x2', W - pad);
    xAxis.setAttribute('y2', H - pad);
    xAxis.setAttribute('stroke', '#9aa4b2');
    xAxis.setAttribute('stroke-width', '1');
    svg.appendChild(xAxis);

    const yAxis = document.createElementNS(svg.namespaceURI, 'line');
    yAxis.setAttribute('x1', pad);
    yAxis.setAttribute('y1', pad);
    yAxis.setAttribute('x2', pad);
    yAxis.setAttribute('y2', H - pad);
    yAxis.setAttribute('stroke', '#9aa4b2');
    yAxis.setAttribute('stroke-width', '1');
    svg.appendChild(yAxis);

    const xScale = (i) => pad + (W - pad * 2) * (i / Math.max(1, steps - 1));
    const yScale = (v) => H - pad - (H - pad * 2) * (clamp01(v) / maxY);

    for (let k = 0; k < n; k++) {
      const color = colors[k % colors.length] || '#2a6df4';
      let d = '';
      for (let i = 0; i < steps; i++) {
        const v = timeline[i][k] ?? 0;
        const x = xScale(i);
        const y = yScale(v);
        d += (i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`);
      }
      const path = document.createElementNS(svg.namespaceURI, 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', color);
      path.setAttribute('stroke-width', '2');
      svg.appendChild(path);
    }

    // y-axis labels 0, 0.5, 1
    const ticks = [0, 0.5, 1];
    ticks.forEach(t => {
      const ty = yScale(t);
      const label = document.createElementNS(svg.namespaceURI, 'text');
      label.setAttribute('x', pad - 6);
      label.setAttribute('y', ty + 3);
      label.setAttribute('text-anchor', 'end');
      label.setAttribute('font-size', '10');
      label.textContent = format ? format(t) : t.toFixed(2);
      svg.appendChild(label);

      const grid = document.createElementNS(svg.namespaceURI, 'line');
      grid.setAttribute('x1', pad);
      grid.setAttribute('y1', ty);
      grid.setAttribute('x2', W - pad);
      grid.setAttribute('y2', ty);
      grid.setAttribute('stroke', '#e5e7eb');
      grid.setAttribute('stroke-width', '1');
      grid.setAttribute('stroke-dasharray', '3,3');
      svg.appendChild(grid);
    });

    el.appendChild(svg);
  }
};
