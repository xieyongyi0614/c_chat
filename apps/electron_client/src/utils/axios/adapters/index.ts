import { electronTokenProvider } from './electronTokenProvider';
import { electronErrorReporter } from './electronErrorReporter';
import { electronContextResolver } from './electronContextResolver';
import { electronClientInfo } from './electronClientInfo';

export const electronAdapters = {
  tokenProvider: electronTokenProvider,
  errorReporter: electronErrorReporter,
  contextResolver: electronContextResolver,
  clientInfo: electronClientInfo,
} as const;
