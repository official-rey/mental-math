export interface View {
  el: HTMLElement;
  title?: string;
  /** Called after the view is in the document. */
  mounted?(): void;
  destroy?(): void;
}

export type RouteFn = (parts: string[], query: URLSearchParams) => View | Promise<View>;

let current: View | null = null;
let seq = 0;

export function startRouter(root: HTMLElement, routes: Record<string, RouteFn>, fallback: RouteFn) {
  async function render() {
    const id = ++seq;
    const raw = location.hash.replace(/^#\/?/, '');
    const [path, qs] = raw.split('?');
    const parts = path.split('/').filter(Boolean);
    const fn = routes[parts[0] ?? ''] ?? fallback;
    const view = await fn(parts.slice(1), new URLSearchParams(qs ?? ''));
    if (id !== seq) {
      view.destroy?.();
      return;
    }
    current?.destroy?.();
    current = view;
    root.replaceChildren(view.el);
    document.title = view.title ? `${view.title} · Mental Math` : 'Mental Math';
    window.scrollTo(0, 0);
    view.mounted?.();
  }
  addEventListener('hashchange', render);
  render();
}

export function go(hash: string) {
  if (location.hash === hash) dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
}
