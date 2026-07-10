import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';

// No router: view-switching is handled via a signal in AisService (see workflow-app convention).
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners()
  ]
};
