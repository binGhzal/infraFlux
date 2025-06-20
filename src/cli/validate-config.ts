#!/usr/bin/env node

/**
 * InfraFlux Configuration Validation CLI
 *
 * Usage:
 *   npm run validate-config
 *   npx ts-node src/cli/validate-config.ts
 *   infraflux validate-config
 */

import { config } from '@/config';
import {
  validateConfigCLI,
  generateConfigTemplate,
} from '@/utils/config-validator';
import { logger } from '@/utils/logger';

const args = process.argv.slice(2);

function showHelp() {
  console.log(`
InfraFlux Configuration Validator

Usage:
  npm run validate-config              Validate current configuration
  npm run validate-config -- --help    Show this help
  npm run validate-config -- --template Generate config template

Commands:
  validate     Validate the current .env configuration
  template     Generate a documented configuration template
  help         Show this help message

Examples:
  npm run validate-config
  npm run validate-config -- --template > .env.template

Environment Variables:
  LOG_LEVEL    Set logging level (debug, info, warn, error)
`);
}

function generateTemplate() {
  console.log(generateConfigTemplate());
}

async function main() {
  const command = args[0] || 'validate';

  switch (command) {
    case '--help':
    case 'help':
      showHelp();
      process.exit(0);
      break;

    case '--template':
    case 'template':
      generateTemplate();
      process.exit(0);
      break;

    case 'validate':
    default:
      console.log('🔍 InfraFlux Configuration Validator\n');

      try {
        // Load and validate configuration
        const exitCode = validateConfigCLI(config);

        if (exitCode === 0) {
          console.log('\n✅ Configuration is valid and ready for deployment!');
          console.log('\nNext steps:');
          console.log('  1. Run: npm run build');
          console.log('  2. Run: pulumi up');
        } else {
          console.log(
            '\n❌ Please fix the configuration errors above before proceeding.'
          );
          console.log('\nHelp:');
          console.log(
            '  • Generate template: npm run validate-config -- --template'
          );
          console.log('  • Check documentation: cat README.md');
        }

        process.exit(exitCode);
      } catch (error) {
        logger.error('Configuration validation failed with error', error);
        console.error('\n💥 Fatal error during validation:');
        console.error(`   ${error instanceof Error ? error.message : String(error)}`);
        console.log('\nThis usually indicates:');
        console.log('  • Missing .env file');
        console.log('  • Invalid environment variable format');
        console.log('  • Missing required dependencies');
        process.exit(1);
      }
      break;
  }
}

// Handle uncaught errors gracefully
process.on('unhandledRejection', (error) => {
  console.error('\n💥 Unhandled error:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught exception:', error);
  process.exit(1);
});

// Run the CLI
main().catch((error) => {
  console.error('\n💥 CLI error:', error);
  process.exit(1);
});
