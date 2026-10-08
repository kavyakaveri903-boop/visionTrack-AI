import { TrackedObject, SmartZone, ZoneStats } from '../types/vision';

export interface RenderOptions {
  focusClass: string | null;
  showTrajectories: boolean;
  showLabels: boolean;
  confidenceThreshold: number;
}

export function renderVisionOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  tracks: TrackedObject[],
  zone: SmartZone | null,
  zoneStats: ZoneStats,
  options: RenderOptions
) {
  ctx.clearRect(0, 0, width, height);

  // 1. Draw Smart Zone if active
  if (zone && zone.active) {
    const zx = (zone.x / 100) * width;
    const zy = (zone.y / 100) * height;
    const zw = (zone.width / 100) * width;
    const zh = (zone.height / 100) * height;

    const hasObjects = zoneStats.objectsInside > 0;
    const zoneColor = hasObjects ? '#f59e0b' : '#00f0ff'; // amber if triggered, cyan if idle

    ctx.save();
    // Fill
    ctx.fillStyle = hasObjects ? 'rgba(245, 158, 11, 0.12)' : 'rgba(0, 240, 255, 0.08)';
    ctx.fillRect(zx, zy, zw, zh);

    // Border
    ctx.strokeStyle = zoneColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.strokeRect(zx, zy, zw, zh);
    ctx.setLineDash([]);

    // Corner brackets
    const bracketSize = Math.min(16, zw / 4, zh / 4);
    ctx.lineWidth = 3;

    // Top-left
    ctx.beginPath();
    ctx.moveTo(zx, zy + bracketSize);
    ctx.lineTo(zx, zy);
    ctx.lineTo(zx + bracketSize, zy);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(zx + zw - bracketSize, zy);
    ctx.lineTo(zx + zw, zy);
    ctx.lineTo(zx + zw, zy + bracketSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(zx, zy + zh - bracketSize);
    ctx.lineTo(zx, zy + zh);
    ctx.lineTo(zx + bracketSize, zy + zh);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(zx + zw - bracketSize, zy + zh);
    ctx.lineTo(zx + zw, zy + zh);
    ctx.lineTo(zx + zw, zy + zh - bracketSize);
    ctx.stroke();

    // Zone Badge
    const badgeText = hasObjects
      ? `⚠ SMART ZONE [INSIDE: ${zoneStats.objectsInside}]`
      : `SMART ZONE ACTIVE`;
    ctx.font = 'bold 11px Inter, system-ui, sans-serif';
    const textMetrics = ctx.measureText(badgeText);
    const badgeWidth = textMetrics.width + 16;
    const badgeHeight = 22;

    const badgeX = zx + 8;
    const badgeY = zy + 8;

    ctx.fillStyle = hasObjects ? 'rgba(245, 158, 11, 0.9)' : 'rgba(10, 25, 47, 0.85)';
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, 4);
    ctx.fill();

    ctx.fillStyle = hasObjects ? '#000000' : '#00f0ff';
    ctx.fillText(badgeText, badgeX + 8, badgeY + 15);
    ctx.restore();
  }

  // 2. Draw Trajectories
  if (options.showTrajectories) {
    ctx.save();
    for (const track of tracks) {
      if (track.history.length < 2) continue;

      const isFocused = !options.focusClass || track.class === options.focusClass;
      const alpha = isFocused ? 0.7 : 0.15;

      ctx.strokeStyle = track.color;
      ctx.lineWidth = isFocused ? 2.5 : 1;
      ctx.beginPath();

      track.history.forEach((pt, idx) => {
        if (idx === 0) {
          ctx.moveTo(pt.x, pt.y);
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      });

      ctx.globalAlpha = alpha;
      ctx.stroke();

      // Current centroid dot
      const lastPt = track.history[track.history.length - 1];
      ctx.fillStyle = track.color;
      ctx.beginPath();
      ctx.arc(lastPt.x, lastPt.y, isFocused ? 3.5 : 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Draw Bounding Boxes and Labels
  for (const track of tracks) {
    const [x, y, w, h] = track.bbox;
    const isFocused = !options.focusClass || track.class === options.focusClass;

    ctx.save();

    const boxAlpha = isFocused ? 1.0 : 0.15;
    ctx.globalAlpha = boxAlpha;

    // Glowing border if focused
    if (isFocused && options.focusClass) {
      ctx.shadowColor = track.color;
      ctx.shadowBlur = 12;
    }

    // Box stroke
    ctx.strokeStyle = track.color;
    ctx.lineWidth = isFocused ? 2.5 : 1.5;
    ctx.strokeRect(x, y, w, h);

    // Corner accents
    const corner = Math.min(10, w / 4, h / 4);
    ctx.lineWidth = isFocused ? 3.5 : 2;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + corner);
    ctx.lineTo(x, y);
    ctx.lineTo(x + corner, y);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + w - corner, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w, y + corner);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + h - corner);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x + corner, y + h);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + w - corner, y + h);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x + w, y + h - corner);
    ctx.stroke();

    // Box Label
    if (options.showLabels) {
      ctx.shadowBlur = 0; // reset shadow for clean text
      const confidencePercent = Math.round(track.score * 100);
      const classNameFormatted = track.class.charAt(0).toUpperCase() + track.class.slice(1);
      const labelText = `${classNameFormatted} • ID: ${track.displayId} • ${confidencePercent}%`;

      ctx.font = '600 11px Inter, system-ui, -apple-system, sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const paddingX = 7;
      const pillW = textMetrics.width + paddingX * 2;
      const pillH = 20;

      // Position pill above box, or inside if too close to top
      const pillY = y - pillH >= 4 ? y - pillH - 4 : y + 4;
      const pillX = Math.max(4, Math.min(x, width - pillW - 4));

      // Pill Background
      ctx.fillStyle = isFocused ? '#07111f' : 'rgba(7, 17, 31, 0.7)';
      ctx.beginPath();
      ctx.roundRect(pillX, pillY, pillW, pillH, 4);
      ctx.fill();

      // Pill border
      ctx.strokeStyle = track.color;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Pill Text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(labelText, pillX + paddingX, pillY + 14);
    }

    ctx.restore();
  }
}
