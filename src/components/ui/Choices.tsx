import { ScrollView, Pressable, Text } from 'react-native';
export function Choices<T extends string>({ values, value, onChange }: { values: readonly T[]; value: T; onChange: (value: T) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
    {values.map(item => <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected: item === value }} onPress={() => onChange(item)} style={{ minHeight: 44, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: item === value ? '#1e40af' : '#c4c5d5', backgroundColor: item === value ? '#1e40af' : '#ffffff', justifyContent: 'center' }}><Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13, lineHeight: 20, color: item === value ? '#fff' : '#444653', textTransform: 'capitalize' }}>{item}</Text></Pressable>)}
  </ScrollView>;
}
