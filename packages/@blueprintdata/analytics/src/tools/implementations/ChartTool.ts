import type { Tool, ToolContext } from '../types.js';

export const generateChartTool: Tool = {
  definition: {
    name: 'generate_chart',
    description: 'Generate a chart configuration from data for visualization',
    parameters: [
      {
        name: 'data',
        type: 'array',
        description: 'Array of data objects',
        required: true,
      },
      {
        name: 'type',
        type: 'string',
        description: 'Chart type: line, bar, pie',
        required: true,
        enum: ['line', 'bar', 'pie'],
      },
      {
        name: 'title',
        type: 'string',
        description: 'Chart title',
        required: false,
      },
      {
        name: 'xAxis',
        type: 'string',
        description: 'Field name for X-axis (line/bar charts)',
        required: false,
      },
      {
        name: 'yAxis',
        type: 'string',
        description: 'Field name for Y-axis (line/bar charts)',
        required: false,
      },
      {
        name: 'seriesKey',
        type: 'string',
        description: 'Field name to split multiple series (line/bar charts)',
        required: false,
      },
      {
        name: 'stacked',
        type: 'boolean',
        description: 'Stack series for bar/line charts when seriesKey is set',
        required: false,
      },
      {
        name: 'topNSeries',
        type: 'number',
        description: 'Keep only the top N series by total value (seriesKey required)',
        required: false,
      },
      {
        name: 'fillMissing',
        type: 'boolean',
        description: 'Fill missing series values with 0 (seriesKey required)',
        required: false,
      },
      {
        name: 'xAxisOrder',
        type: 'string',
        description: 'Order for X-axis: asc, desc, or input (line/bar charts)',
        required: false,
        enum: ['asc', 'desc', 'input'],
      },
      {
        name: 'labelField',
        type: 'string',
        description: 'Field name for labels (pie charts)',
        required: false,
      },
      {
        name: 'valueField',
        type: 'string',
        description: 'Field name for values (pie charts)',
        required: false,
      },
    ],
  },

  async execute(args: Record<string, unknown>, _context: ToolContext): Promise<unknown> {
    const data = args.data as Record<string, unknown>[];
    const type = args.type as string;
    const title = (args.title as string) || 'Chart';

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array');
    }

    // Generate Chart.js configuration
    const options: Record<string, unknown> = {
      responsive: true,
      plugins: {
        title: {
          display: !!title,
          text: title,
        },
      },
    };
    const config: Record<string, unknown> = {
      type,
      data: {},
      options,
    };

    if (type === 'pie') {
      const labelField = (args.labelField as string) || Object.keys(data[0])[0];
      const valueField = (args.valueField as string) || Object.keys(data[0])[1];

      config.data = {
        labels: data.map((d) => String(d[labelField])),
        datasets: [
          {
            data: data.map((d) => Number(d[valueField]) || 0),
            backgroundColor: generateColors(data.length),
          },
        ],
      };
    } else {
      // Line or bar chart
      const xAxis = (args.xAxis as string) || Object.keys(data[0])[0];
      const yAxis = (args.yAxis as string) || Object.keys(data[0])[1];
      const seriesKey = args.seriesKey as string | undefined;
      const stacked = Boolean(args.stacked);
      const topNSeries = typeof args.topNSeries === 'number' ? args.topNSeries : undefined;
      const fillMissing = Boolean(args.fillMissing);
      const xAxisOrder = (args.xAxisOrder as string) || 'input';

      if (seriesKey) {
        const { labels, datasets } = buildSeriesDatasets({
          data,
          xAxis,
          yAxis,
          seriesKey,
          topNSeries,
          fillMissing,
          xAxisOrder,
          type,
        });
        config.data = { labels, datasets };
        if (stacked) {
          const currentOptions = (config.options || {}) as Record<string, unknown>;
          config.options = {
            ...currentOptions,
            scales: {
              x: { stacked: true },
              y: { stacked: true },
            },
          };
        }
      } else {
        config.data = {
          labels: data.map((d) => String(d[xAxis])),
          datasets: [
            {
              label: yAxis,
              data: data.map((d) => normalizeNumber(d[yAxis])),
              backgroundColor: type === 'bar' ? 'rgba(54, 162, 235, 0.5)' : undefined,
              borderColor: 'rgba(54, 162, 235, 1)',
              borderWidth: 2,
            },
          ],
        };
      }
    }

    return {
      chartConfig: config,
      type,
      dataPoints: data.length,
    };
  },
};

function generateColors(count: number): string[] {
  const colors = [
    'rgba(255, 99, 132, 0.7)',
    'rgba(54, 162, 235, 0.7)',
    'rgba(255, 206, 86, 0.7)',
    'rgba(75, 192, 192, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 159, 64, 0.7)',
  ];

  return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
}

function normalizeNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildSeriesDatasets(params: {
  data: Record<string, unknown>[];
  xAxis: string;
  yAxis: string;
  seriesKey: string;
  topNSeries?: number;
  fillMissing: boolean;
  xAxisOrder: string;
  type: string;
}): { labels: string[]; datasets: Array<Record<string, unknown>> } {
  const { data, xAxis, yAxis, seriesKey, topNSeries, fillMissing, xAxisOrder, type } = params;
  const seriesMap = new Map<string, Map<string, number>>();
  const seriesTotals = new Map<string, number>();
  const xAxisValues: string[] = [];
  const xAxisSeen = new Set<string>();

  for (const row of data) {
    const xValue = String(row[xAxis]);
    const seriesValue = String(row[seriesKey]);
    const yValue = normalizeNumber(row[yAxis]);

    if (!xAxisSeen.has(xValue)) {
      xAxisSeen.add(xValue);
      xAxisValues.push(xValue);
    }

    const seriesEntries = seriesMap.get(seriesValue) || new Map<string, number>();
    seriesEntries.set(xValue, (seriesEntries.get(xValue) || 0) + yValue);
    seriesMap.set(seriesValue, seriesEntries);
    seriesTotals.set(seriesValue, (seriesTotals.get(seriesValue) || 0) + yValue);
  }

  let labels = [...xAxisValues];
  if (xAxisOrder === 'asc') {
    labels.sort((a, b) => a.localeCompare(b));
  } else if (xAxisOrder === 'desc') {
    labels.sort((a, b) => b.localeCompare(a));
  }

  let seriesKeys = Array.from(seriesMap.keys());
  if (topNSeries && topNSeries > 0) {
    seriesKeys = seriesKeys
      .sort((a, b) => (seriesTotals.get(b) || 0) - (seriesTotals.get(a) || 0))
      .slice(0, topNSeries);
  }

  const colors = generateColors(seriesKeys.length);
  const datasets = seriesKeys.map((seriesValue, index) => {
    const seriesEntries = seriesMap.get(seriesValue) || new Map<string, number>();
    const seriesData = labels.map((label) => {
      if (seriesEntries.has(label)) {
        return seriesEntries.get(label) || 0;
      }
      return fillMissing ? 0 : null;
    });
    const color = colors[index];

    return {
      label: seriesValue,
      data: seriesData,
      backgroundColor: type === 'bar' ? color : undefined,
      borderColor: color.replace('0.7', '1'),
      borderWidth: 2,
      fill: false,
    } as Record<string, unknown>;
  });

  return { labels, datasets };
}
