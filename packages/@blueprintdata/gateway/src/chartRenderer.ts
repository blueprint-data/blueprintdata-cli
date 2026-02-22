import { Chart, registerables, type ChartConfiguration } from 'chart.js';
import { createCanvas } from '@napi-rs/canvas';

let chartRegistered = false;

function ensureChartRegistered() {
  if (!chartRegistered) {
    Chart.register(...registerables);
    chartRegistered = true;
  }
}

function normalizeChartConfig(config: Record<string, unknown>): ChartConfiguration {
  const options = (config.options as Record<string, unknown> | undefined) || {};

  return {
    ...(config as unknown as ChartConfiguration),
    options: {
      ...options,
      responsive: false,
      animation: false,
    },
  } as ChartConfiguration;
}

export async function renderChartToBase64(
  chartConfig: Record<string, unknown>,
  width = 800,
  height = 450
): Promise<string> {
  ensureChartRegistered();

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const chart = new Chart(ctx as unknown as any, normalizeChartConfig(chartConfig));
  const buffer = await canvas.encode('png');
  chart.destroy();

  return buffer.toString('base64');
}
