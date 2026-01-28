import { InitService } from '../services/analytics/InitService.js';
import { ConfigurationService } from '../services/analytics/ConfigurationService.js';

/**
 * Factory for creating service instances with proper dependency wiring
 */
export class ServiceFactory {
  /**
   * Create InitService with all dependencies
   */
  static createInitService(): InitService {
    const configService = new ConfigurationService();
    return new InitService(configService);
  }

  /**
   * Create ConfigurationService
   */
  static createConfigurationService(): ConfigurationService {
    return new ConfigurationService();
  }
}
