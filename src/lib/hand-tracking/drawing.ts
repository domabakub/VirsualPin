import type { TrackedHand } from "./types";
import { RIGHT_PINCH } from "./virtualPhinInteraction";

export type HandDrawingMode = "skeleton" | "instrument";

const CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];

type Projection = { x: number; y: number };

function project(
  x: number,
  y: number,
  sourceWidth: number,
  sourceHeight: number,
  viewWidth: number,
  viewHeight: number,
  mirrored: boolean,
): Projection {
  // Front camera is mirrored like a selfie; rear camera keeps sensor coordinates.
  const scale = Math.max(viewWidth / sourceWidth, viewHeight / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  return {
    x: (mirrored ? 1 - x : x) * renderedWidth + (viewWidth - renderedWidth) / 2,
    y: y * renderedHeight + (viewHeight - renderedHeight) / 2,
  };
}

export function drawHands(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  hands: TrackedHand[],
  mirrored: boolean,
  mode: HandDrawingMode = "skeleton",
) {
  const bounds = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const bitmapWidth = Math.round(width * dpr);
  const bitmapHeight = Math.round(height * dpr);

  if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
    canvas.width = bitmapWidth;
    canvas.height = bitmapHeight;
  }

  const context = canvas.getContext("2d");
  if (!context) return;
  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  if (!video.videoWidth || !video.videoHeight) return;

  for (const hand of hands) {
    const color = hand.side === "Left" ? "#f4b94f" : "#67ef98";
    const points = hand.landmarks.map((landmark) =>
      project(landmark.x, landmark.y, video.videoWidth, video.videoHeight, width, height, mirrored),
    );

    if (mode === "instrument") {
      context.shadowBlur = 0;
      if (hand.side === "Left") {
        // Thumb is the pinch modifier; fingers 1, 2 and 3 map to strings.
        const thumbPoint = points[4];
        context.beginPath();
        context.arc(thumbPoint.x, thumbPoint.y, 8, 0, Math.PI * 2);
        context.fillStyle = "rgba(141, 86, 36, .72)";
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = "rgba(255, 232, 185, .95)";
        context.stroke();
        context.fillStyle = "#fff2d6";
        context.font = "600 9px system-ui";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("T", thumbPoint.x, thumbPoint.y + 0.5);

        [8, 12, 16].forEach((tipIndex, fingerIndex) => {
          const point = points[tipIndex];
          context.beginPath();
          context.arc(point.x, point.y, 8, 0, Math.PI * 2);
          context.fillStyle = "rgba(20, 15, 10, .55)";
          context.fill();
          context.lineWidth = 2;
          context.strokeStyle = "rgba(255, 232, 185, .95)";
          context.stroke();
          context.fillStyle = "#fff2d6";
          context.font = "600 9px system-ui";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(String(fingerIndex + 1), point.x, point.y + 0.5);
        });
      } else {
        // Thumb + index become one focus point while pinched.
        const thumbPoint = points[4];
        const indexPoint = points[8];
        const palmScale = Math.max(0.0001, Math.hypot(
          hand.landmarks[5].x - hand.landmarks[17].x,
          hand.landmarks[5].y - hand.landmarks[17].y,
          (hand.landmarks[5].z ?? 0) - (hand.landmarks[17].z ?? 0),
        ));
        const pinchRatio = Math.hypot(
          hand.landmarks[4].x - hand.landmarks[8].x,
          hand.landmarks[4].y - hand.landmarks[8].y,
          (hand.landmarks[4].z ?? 0) - (hand.landmarks[8].z ?? 0),
        ) / palmScale;

        if (pinchRatio <= RIGHT_PINCH.releaseRatio) {
          const focusPoint = {
            x: (thumbPoint.x + indexPoint.x) / 2,
            y: (thumbPoint.y + indexPoint.y) / 2,
          };
          context.beginPath();
          context.arc(focusPoint.x, focusPoint.y, 14, 0, Math.PI * 2);
          context.fillStyle = "rgba(103, 239, 152, .18)";
          context.fill();
          context.beginPath();
          context.arc(focusPoint.x, focusPoint.y, 6, 0, Math.PI * 2);
          context.fillStyle = "#fff4d6";
          context.fill();
          context.lineWidth = 2.5;
          context.strokeStyle = "#4ecf7c";
          context.stroke();
        } else {
          [thumbPoint, indexPoint].forEach((point) => {
            context.beginPath();
            context.arc(point.x, point.y, 6, 0, Math.PI * 2);
            context.fillStyle = "rgba(20, 15, 10, .45)";
            context.fill();
            context.lineWidth = 1.5;
            context.strokeStyle = "rgba(255, 244, 214, .8)";
            context.stroke();
          });
        }
      }
      continue;
    }

    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = 2.2;
    context.strokeStyle = color;
    context.shadowColor = color;
    context.shadowBlur = 8;
    context.globalAlpha = 0.82;

    for (const [from, to] of CONNECTIONS) {
      context.beginPath();
      context.moveTo(points[from].x, points[from].y);
      context.lineTo(points[to].x, points[to].y);
      context.stroke();
    }

    context.globalAlpha = 1;
    points.forEach((point, index) => {
      const isTip = [4, 8, 12, 16, 20].includes(index);
      context.beginPath();
      context.arc(point.x, point.y, isTip ? 5.2 : 3.2, 0, Math.PI * 2);
      context.fillStyle = isTip ? "#ffffff" : color;
      context.fill();
    });

    const wrist = points[0];
    const labelX = Math.min(Math.max(wrist.x + 12, 8), width - 96);
    const labelY = Math.min(Math.max(wrist.y + 18, 28), height - 12);
    context.shadowBlur = 0;
    context.fillStyle = "rgba(5, 13, 16, .76)";
    context.beginPath();
    context.roundRect(labelX, labelY - 23, 88, 28, 9);
    context.fill();
    context.fillStyle = color;
    context.font = "600 12px system-ui";
    context.fillText(`${hand.side === "Left" ? "มือซ้าย" : "มือขวา"} ${Math.round(hand.confidence * 100)}%`, labelX + 9, labelY - 5);
    context.textAlign = "start";
    context.textBaseline = "alphabetic";
  }
}
