import type { TrackedHand } from "./types";

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
): Projection {
  // Camera is mirrored, then cropped with object-fit: cover.
  const scale = Math.max(viewWidth / sourceWidth, viewHeight / sourceHeight);
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  return {
    x: (1 - x) * renderedWidth + (viewWidth - renderedWidth) / 2,
    y: y * renderedHeight + (viewHeight - renderedHeight) / 2,
  };
}

export function drawHands(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  hands: TrackedHand[],
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
      project(landmark.x, landmark.y, video.videoWidth, video.videoHeight, width, height),
    );

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
  }
}
