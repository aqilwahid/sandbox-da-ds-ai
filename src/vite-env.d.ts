/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.py?raw' {
  const src: string;
  export default src;
}

declare module '*.yaml?raw' {
  const src: string;
  export default src;
}

declare module '*.json?raw' {
  const src: string;
  export default src;
}

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_ORG_NAME?: string;
  readonly VITE_TRAINING_TITLE?: string;
}
