import { useNetworkState } from 'expo-network';
export function useNetworkStatus() {
  const state = useNetworkState();
  const isOffline = state.isConnected === false || state.isInternetReachable === false;
  return { isOffline, isOnline: state.isConnected === true && !isOffline };
}
