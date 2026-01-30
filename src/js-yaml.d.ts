declare module "js-yaml" {
  function load(str: string, options?: object): unknown;
  function dump(obj: unknown, options?: { lineWidth?: number; noRefs?: boolean }): string;
  const yaml: { load: typeof load; dump: typeof dump };
  export default yaml;
}
