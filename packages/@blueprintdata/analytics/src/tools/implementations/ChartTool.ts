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
    const config: Record<string, unknown> = {
      type,
      data: {},
      options: {
        responsive: true,
        plugins: {
          title: {
            display: !!title,
            text: title,
          },
        },
      },
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

      config.data = {
        labels: data.map((d) => String(d[xAxis])),
        datasets: [
          {
            label: yAxis,
            data: data.map((d) => Number(d[yAxis]) || 0),
            backgroundColor: type === 'bar' ? 'rgba(54, 162, 235, 0.5)' : undefined,
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 2,
          },
        ],
      };
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
