declare module 'swagger-ui-react' {
  import { ComponentType } from 'react';

  interface SwaggerUIProps {
    url?: string;
    spec?: object;
    layout?: string;
    docExpansion?: 'list' | 'full' | 'none';
    defaultModelsExpandDepth?: number;
    defaultModelExpandDepth?: number;
    displayRequestDuration?: boolean;
    filter?: boolean | string;
    requestInterceptor?: (request: object) => object;
    responseInterceptor?: (response: object) => object;
    onComplete?: (system: object) => void;
    presets?: object[];
    plugins?: object[];
    supportedSubmitMethods?: string[];
    deepLinking?: boolean;
    showMutatedRequest?: boolean;
    showExtensions?: boolean;
    showCommonExtensions?: boolean;
    tryItOutEnabled?: boolean;
    requestSnippetsEnabled?: boolean;
    requestSnippets?: object;
    persistAuthorization?: boolean;
  }

  const SwaggerUI: ComponentType<SwaggerUIProps>;
  export default SwaggerUI;
}
