import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

export function TabIcon({ name, active }: { name: ComponentProps<typeof Feather>['name']; active: boolean }) {
  return <View style={[styles.pill, active && styles.selected]}>
    <Feather name={name} size={23} color={active ? '#1e40af' : '#444653'} />
  </View>;
}

const styles = StyleSheet.create({
  pill: { width: 60, height: 34, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  selected: { backgroundColor: '#e6efff' },
});
