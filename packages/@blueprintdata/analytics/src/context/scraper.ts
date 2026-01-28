import fs from 'fs-extra';
import path from 'path';
import { CompanyContext } from '@blueprintdata/models';

/**
 * Website scraper - fetches and extracts content from URLs
 */
export class WebsiteScraper {
  /**
   * Scrape content from a URL using webfetch
   */
  async scrapeUrl(url: string): Promise<string> {
    try {
      // Use dynamic import for webfetch (if available in environment)
      // For now, we'll use a simple fetch with markdown conversion
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'BlueprintData Analytics CLI/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();

      // Simple HTML to text conversion
      // Remove script and style tags
      let text = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

      // Remove HTML tags
      text = text.replace(/<[^>]+>/g, ' ');

      // Clean up whitespace
      text = text.replace(/\s+/g, ' ').trim();

      // Limit length to prevent token overflow
      const maxLength = 5000;
      if (text.length > maxLength) {
        text = text.substring(0, maxLength) + '...';
      }

      return text;
    } catch (error) {
      console.error(`Failed to scrape ${url}:`, error);
      return '';
    }
  }

  /**
   * Scrape multiple URLs
   */
  async scrapeUrls(urls: string[]): Promise<string[]> {
    const results: string[] = [];

    for (const url of urls) {
      console.log(`  Scraping ${url}...`);
      const content = await this.scrapeUrl(url);
      if (content) {
        results.push(content);
      }
    }

    return results;
  }
}

/**
 * dbt project code scanner - extracts business context from dbt files
 */
export class DbtProjectScanner {
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Scan dbt project for business terminology and context
   */
  async scanProject(): Promise<{
    terminology: string[];
    domains: string[];
    metrics: string[];
  }> {
    const terminology = new Set<string>();
    const domains = new Set<string>();
    const metrics = new Set<string>();

    // Scan model names for domains
    await this.scanModelNames(domains);

    // Scan schema.yml files for descriptions and metrics
    await this.scanSchemaYaml(terminology, metrics);

    // Scan SQL files for common business terms
    await this.scanSqlFiles(terminology);

    return {
      terminology: Array.from(terminology),
      domains: Array.from(domains),
      metrics: Array.from(metrics),
    };
  }

  /**
   * Extract domains from model names (e.g., fct_orders -> orders domain)
   */
  private async scanModelNames(domains: Set<string>): Promise<void> {
    const modelsPath = path.join(this.projectPath, 'models');
    if (!(await fs.pathExists(modelsPath))) return;

    const sqlFiles = await this.findSqlFiles(modelsPath);

    for (const file of sqlFiles) {
      const basename = path.basename(file, '.sql');

      // Extract domain from common naming patterns
      // fct_orders -> orders
      // dim_customers -> customers
      // stg_shopify_orders -> orders
      const patterns = [/^(fct|dim|int|stg)_(.+)$/, /^(fct|dim|int|stg)_[^_]+_(.+)$/];

      for (const pattern of patterns) {
        const match = basename.match(pattern);
        if (match && match[2]) {
          const domain = match[2].replace(/_/g, ' ');
          domains.add(domain);
          break;
        }
      }
    }
  }

  /**
   * Scan schema.yml files for descriptions and metrics
   */
  private async scanSchemaYaml(terminology: Set<string>, metrics: Set<string>): Promise<void> {
    const modelsPath = path.join(this.projectPath, 'models');
    if (!(await fs.pathExists(modelsPath))) return;

    const yamlFiles = await this.findYamlFiles(modelsPath);

    for (const file of yamlFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const yaml = await import('yaml');
        const data = yaml.parse(content);

        // Extract from model descriptions
        if (data?.models) {
          for (const model of data.models) {
            if (model.description) {
              this.extractTerms(model.description, terminology);
            }

            // Extract from column descriptions
            if (model.columns) {
              for (const column of model.columns) {
                if (column.description) {
                  this.extractTerms(column.description, terminology);
                }

                // Look for metric-like column names
                if (this.isMetricColumn(column.name)) {
                  metrics.add(column.name);
                }
              }
            }
          }
        }
      } catch (error) {
        // Skip files that fail to parse
        continue;
      }
    }
  }

  /**
   * Scan SQL files for business terms in comments
   */
  private async scanSqlFiles(terminology: Set<string>): Promise<void> {
    const modelsPath = path.join(this.projectPath, 'models');
    if (!(await fs.pathExists(modelsPath))) return;

    const sqlFiles = await this.findSqlFiles(modelsPath);

    for (const file of sqlFiles) {
      try {
        const content = await fs.readFile(file, 'utf-8');

        // Extract from SQL comments
        const commentPattern = /--\s*(.+)$/gm;
        let match;

        while ((match = commentPattern.exec(content)) !== null) {
          this.extractTerms(match[1], terminology);
        }

        // Extract from block comments
        const blockCommentPattern = /\/\*\s*([\s\S]*?)\s*\*\//g;
        while ((match = blockCommentPattern.exec(content)) !== null) {
          this.extractTerms(match[1], terminology);
        }
      } catch (error) {
        continue;
      }
    }
  }

  /**
   * Extract meaningful terms from text
   */
  private extractTerms(text: string, terms: Set<string>): void {
    // Look for capitalized business terms (2-3 words)
    const termPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g;
    let match;

    while ((match = termPattern.exec(text)) !== null) {
      const term = match[1].trim();
      if (term.length > 3 && !this.isCommonWord(term)) {
        terms.add(term);
      }
    }
  }

  /**
   * Check if column name looks like a metric
   */
  private isMetricColumn(name: string): boolean {
    const metricPatterns = [
      /^(total|sum|avg|count|max|min)_/i,
      /_(total|sum|avg|count|amount|revenue|cost|value)$/i,
      /^(mrr|arr|ltv|cac|arpu|churn)/i,
    ];

    return metricPatterns.some((pattern) => pattern.test(name));
  }

  /**
   * Check if term is a common word to filter out
   */
  private isCommonWord(term: string): boolean {
    const commonWords = new Set([
      'The',
      'This',
      'That',
      'With',
      'From',
      'Into',
      'Table',
      'Model',
      'Column',
      'Data',
      'Query',
      'Select',
      'Where',
      'Group',
      'Order',
    ]);
    return commonWords.has(term);
  }

  /**
   * Recursively find all SQL files
   */
  private async findSqlFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.findSqlFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && entry.name.endsWith('.sql')) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Recursively find all YAML files
   */
  private async findYamlFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await this.findYamlFiles(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && (entry.name.endsWith('.yml') || entry.name.endsWith('.yaml'))) {
        files.push(fullPath);
      }
    }

    return files;
  }
}

/**
 * Collect comprehensive company context from multiple sources
 */
export async function collectCompanyContext(
  userInput: {
    name?: string;
    websites?: string[];
    context?: string;
  },
  projectPath: string
): Promise<CompanyContext> {
  const context: CompanyContext = {
    name: userInput.name,
    websites: userInput.websites,
    userContext: userInput.context,
  };

  // Scrape websites if provided
  if (userInput.websites && userInput.websites.length > 0) {
    console.log('  Scraping company websites...');
    const scraper = new WebsiteScraper();
    context.scrapedContent = await scraper.scrapeUrls(userInput.websites);
  }

  // Scan dbt project for business context
  console.log('  Scanning dbt project for business context...');
  const projectScanner = new DbtProjectScanner(projectPath);
  const scanResults = await projectScanner.scanProject();

  // Infer industry from domains and terminology
  context.industry = inferIndustry(scanResults.domains, scanResults.terminology);
  context.keyMetrics = scanResults.metrics.slice(0, 10); // Top 10 metrics

  return context;
}

/**
 * Infer industry from domains and terminology
 */
function inferIndustry(domains: string[], terminology: string[]): string {
  const allTerms = [...domains, ...terminology].map((t) => t.toLowerCase());

  // E-commerce patterns
  if (
    allTerms.some((t) =>
      ['orders', 'products', 'cart', 'checkout', 'inventory', 'shipment'].includes(t)
    )
  ) {
    return 'E-commerce';
  }

  // SaaS patterns
  if (
    allTerms.some((t) =>
      ['subscription', 'mrr', 'churn', 'activation', 'trial', 'seats'].includes(t)
    )
  ) {
    return 'SaaS';
  }

  // Finance patterns
  if (
    allTerms.some((t) => ['transactions', 'payments', 'accounts', 'balance', 'ledger'].includes(t))
  ) {
    return 'Finance';
  }

  // Marketing patterns
  if (
    allTerms.some((t) =>
      ['campaigns', 'leads', 'conversions', 'attribution', 'channels'].includes(t)
    )
  ) {
    return 'Marketing';
  }

  return 'General';
}
