/**
 * Application-wide configuration
 *
 * This file contains global settings that control the default behavior
 * of the RespiLens application, including default landing pages,
 * UI preferences, and feature flags.
 */

export const APP_CONFIG = {
  /**
   * Default landing page settings
   * These determine what users see when they first visit the site
   */
  defaultDataset: 'covid',
  defaultView: 'frontpage',
  defaultLocation: 'US',

  /**
   * Dataset display order in the UI
   * This controls the order of datasets in the ViewSelector menu
   */
  datasetDisplayOrder: ['covid', 'flu', 'rsv', 'nhsn'],

  /**
   * Feature flags
   * Use these to enable/disable major sections of the application
   */
  features: {
    enableForecastle: true,
    enableNarratives: true,
    enableDocumentation: true,
    enableDashboard: true,
  },
};
