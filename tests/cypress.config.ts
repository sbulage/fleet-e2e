import { defineConfig } from 'cypress'

const qaseAPIToken = process.env.QASE_API_TOKEN

export default defineConfig({
  viewportWidth: 1314,
  viewportHeight: 954,
  defaultCommandTimeout: 10000,
  video: true,
  videoCompression: true,
  reporter: 'cypress-multi-reporters',
  reporterOptions: {
    reporterEnabled: 'cypress-mochawesome-reporter, cypress-qase-reporter',
    cypressMochawesomeReporterReporterOptions: {
      charts: true,
    },
    cypressQaseReporterReporterOptions: {
      apiToken: qaseAPIToken,
      projectCode: 'FLEET',
      logging: false,
      basePath: 'https://api.qase.io/v1',
      // Screenshots are not supported in cypress-qase-reporter@1.4.1 and broken in @1.4.3
      // screenshotFolder: 'screenshots',
      // sendScreenshot: true,
    },
  },
  env: {
    "grepFilterSpecs": true
  },
  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      // Adding task logger
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
      })  
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('cypress/plugins/index.ts')(on, config)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@cypress/grep/src/plugin')(config);
      return config;
    },
    specPattern: 'cypress/e2e/unit_tests/*.spec.ts',
  },
})
