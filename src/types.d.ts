// Ambient declarations for modules that ship without types.

declare module 'echarts/lib/i18n/*.js' {
  const locale: Record<string, unknown>;
  export default locale;
}
