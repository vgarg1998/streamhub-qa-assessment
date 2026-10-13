import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  PieController,
  Tooltip,
} from "chart.js";
import type { YearRow } from "./emi";

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  PieController,
  Tooltip,
  Legend,
);

const principalColor = "#1f6b4a";
const interestColor = "#c4622d";

function replaceChart(canvas: HTMLCanvasElement, build: () => Chart): Chart {
  Chart.getChart(canvas)?.destroy();
  return build();
}

export function renderPie(
  canvas: HTMLCanvasElement,
  principal: number,
  interest: number,
): void {
  canvas.dataset.principal = String(principal);
  canvas.dataset.interest = String(interest);
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    `Payment breakup chart. Principal ${principal}. Interest ${interest}.`,
  );

  replaceChart(canvas, () => {
    return new Chart(canvas, {
      type: "pie",
      data: {
        labels: ["Principal", "Interest"],
        datasets: [
          {
            data: [principal, interest],
            backgroundColor: [principalColor, interestColor],
            borderColor: "#f7f4ee",
            borderWidth: 2,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: true },
        },
      },
    });
  });
}

export function renderBars(canvas: HTMLCanvasElement, rows: YearRow[]): void {
  const values = rows.flatMap((row) => [row.principalPaid, row.interestPaid]);
  const max = values.length === 0 ? 0 : Math.max(...values);
  canvas.dataset.bars = String(rows.length);
  canvas.dataset.max = String(max);
  canvas.setAttribute("role", "img");
  canvas.setAttribute(
    "aria-label",
    `Yearly repayment chart with ${rows.length} bars. Largest amount ${max}.`,
  );

  replaceChart(canvas, () => {
    return new Chart(canvas, {
      type: "bar",
      data: {
        labels: rows.map((row) => `Year ${row.year}`),
        datasets: [
          {
            label: "Principal paid",
            data: rows.map((row) => row.principalPaid),
            backgroundColor: principalColor,
          },
          {
            label: "Interest paid",
            data: rows.map((row) => row.interestPaid),
            backgroundColor: interestColor,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true },
        },
      },
    });
  });
}
