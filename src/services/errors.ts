export function errorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    'functions/not-found': 'Account authorization service is not deployed in this project. Ask the project owner to complete the backend setup.',
    'functions/unavailable': 'Account authorization service is unavailable. Check your connection and backend deployment, then retry.',
    'functions/unauthenticated': 'Sign in again to complete account authorization.',
    'auth/invalid-credential': 'Email or password is incorrect. Use your existing account email or reset your password.',
    'auth/email-already-in-use': 'This email already has an account. Log in or reset your password; do not register again.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/weak-password': 'Use a password with at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please wait and try again.',
    'auth/operation-not-allowed': 'Email/password sign-in is disabled in Firebase Authentication.',
    'auth/network-request-failed': 'Cannot reach Firebase. Check your connection and try again.',
    'permission-denied': 'Firebase denied this operation. Check your account role and deployed Firestore rules.',
    'unavailable': 'Firebase is unavailable. Check your connection and retry.',
  };
  return (code && messages[code]) || (error instanceof Error ? error.message : 'The operation failed. Please retry.');
}
