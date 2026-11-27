// Short status messages at the bottom of the window (role=status, announced by screen readers).

export type ToastKind = 'ok' | 'error';

let timer: ReturnType<typeof setTimeout> | undefined;

export function toast(text: string, kind: ToastKind = 'ok'): void {
  let t = document.querySelector<HTMLElement>('.toast');
  if (!t) {
    t = Object.assign(document.createElement('div'), { className: 'toast' });
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    document.body.append(t);
  }
  t.textContent = text;
  t.className = `toast visible ${kind}`;
  clearTimeout(timer);
  timer = setTimeout(
    () => {
      t.className = 'toast';
    },
    kind === 'error' ? 7000 : 3500,
  );
}
