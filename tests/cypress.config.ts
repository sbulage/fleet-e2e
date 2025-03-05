import { defineConfig } from 'cypress'

const qaseAPIToken = process.env.QASE_API_TOKEN

export default defineConfig({
  viewportWidth: 1396,
  viewportHeight: 954,
  // defaultBrowser: 'chrome',
  defaultCommandTimeout: 10000,
  video: true,
  videoCompression: true,
  // numTestsKeptInMemory: 0, //This flag causes sporadic erros. Avoid using it.
  experimentalMemoryManagement: true,
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
      }),
      // Help for memory issues.
      // Ref: https://www.bigbinary.com/blog/how-we-fixed-the-cypress-out-of-memory-error-in-chromium-browsers
      on("before:browser:launch", (browser, launchOptions) => {
        
        if (["chrome", "edge"].includes(browser.name)) {
          if (browser.isHeadless) {
            launchOptions.args.push("--no-sandbox");
            launchOptions.args.push("--disable-gl-drawing-for-tests");
            launchOptions.args.push("--disable-gpu");
            launchOptions.args.push("--js-flags=--max-old-space-size=3500");
          }
        }
        return launchOptions;
      });  
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('cypress/plugins/index.ts')(on, config)
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@cypress/grep/src/plugin')(config);
      return config;
    },
    specPattern: 'cypress/e2e/unit_tests/*.spec.ts',
    
  },
})
