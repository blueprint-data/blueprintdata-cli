import { EnhancedTableStats } from '@blueprintdata/models';
import { DbtModelMetadata } from '@blueprintdata/models';

/**
 * Generate fallback template when LLM profiling fails
 */
export function generateFallbackProfile(
  stats: EnhancedTableStats,
  dbtMetadata?: DbtModelMetadata
): string {
  let markdown = `# ${stats.schemaName}.${stats.tableName}\n\n`;

  markdown += `⚠️ **Notice:** This profile was generated using a basic template\n`;
  markdown += `due to an error during LLM processing. Run\n`;
  markdown += `\`blueprintdata analytics sync --select ${dbtMetadata?.name || stats.tableName} --force\`\n`;
  markdown += `to retry with full profiling.\n\n`;

  markdown += `---\n\n`;

  // Table Information
  markdown += `## Table Information\n\n`;
  markdown += `- **Database**: ${stats.schemaName}\n`;
  markdown += `- **Table**: ${stats.tableName}\n`;

  if (stats.rowCount !== undefined) {
    markdown += `- **Row Count**: ${stats.rowCount.toLocaleString()}\n`;
  }

  if (stats.sizeInBytes !== undefined) {
    markdown += `- **Size**: ${formatBytes(stats.sizeInBytes)}\n`;
  }

  if (stats.timeRange) {
    markdown += `- **Time Range**: ${stats.timeRange.minDate} to ${stats.timeRange.maxDate}\n`;
  }

  markdown += `\n`;

  // Schema
  markdown += `## Schema\n\n`;
  markdown += `| Column | Type | Nullable | Distinct | Null % |\n`;
  markdown += `|--------|------|----------|----------|--------|\n`;

  for (const column of stats.columns) {
    const nullable = column.nullable ? 'Yes' : 'No';
    const distinct =
      column.distinctCount !== undefined ? column.distinctCount.toLocaleString() : '-';
    const nullPct =
      column.nullPercentage !== undefined ? column.nullPercentage.toFixed(1) + '%' : '-';

    markdown += `| ${column.name} | ${column.type} | ${nullable} | ${distinct} | ${nullPct} |\n`;
  }

  markdown += `\n`;

  // dbt Model Metadata
  if (dbtMetadata) {
    markdown += `## dbt Model Metadata\n\n`;
    markdown += `- **Materialization**: ${dbtMetadata.materializedAs}\n`;

    if (dbtMetadata.tags.length > 0) {
      markdown += `- **Tags**: ${dbtMetadata.tags.join(', ')}\n`;
    }

    if (dbtMetadata.description) {
      markdown += `- **Description**: ${dbtMetadata.description}\n`;
    }

    markdown += `\n`;

    if (dbtMetadata.dependsOn.models.length > 0) {
      markdown += `**Upstream Dependencies:**\n`;
      for (const model of dbtMetadata.dependsOn.models) {
        markdown += `- \`${model}\`\n`;
      }
      markdown += `\n`;
    }

    if (dbtMetadata.dependsOn.sources.length > 0) {
      markdown += `**Sources:**\n`;
      for (const source of dbtMetadata.dependsOn.sources) {
        markdown += `- \`${source.source}.${source.table}\`\n`;
      }
      markdown += `\n`;
    }
  }

  // Column Details with dbt descriptions
  if (dbtMetadata && dbtMetadata.columns.length > 0) {
    markdown += `## Column Descriptions\n\n`;

    for (const col of dbtMetadata.columns) {
      if (col.description) {
        markdown += `### ${col.name}\n\n`;
        markdown += `${col.description}\n\n`;

        if (col.tests && col.tests.length > 0) {
          markdown += `**Tests**: ${col.tests.join(', ')}\n\n`;
        }
      }
    }
  }

  // Example Query
  markdown += `## Example Query\n\n`;
  markdown += `\`\`\`sql\n`;
  markdown += `SELECT *\n`;
  markdown += `FROM ${stats.schemaName}.${stats.tableName}\n`;
  markdown += `LIMIT 10;\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `---\n\n`;
  markdown += `## To Complete This Profile\n\n`;
  markdown += `Run: \`blueprintdata analytics sync --select ${dbtMetadata?.name || stats.tableName} --force\`\n`;

  return markdown;
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
