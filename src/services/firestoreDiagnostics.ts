interface ListenerContext {
  source: string;
  projectId?: string;
  path: string;
  query?: string;
}

/** Preserve the SDK error (including index-creation links) before UI formatting. */
export function logFirestoreListenerError(context: ListenerContext, error: unknown): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;
  const original = error as { code?: unknown; message?: unknown } | null;
  console.warn('[QuickFix Firestore listener]', {
    ...context,
    code: original?.code,
    message: original?.message ?? String(error),
  }, error);
}
