import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '@/constants/colors';
import { fonts, fontSize } from '@/constants/typography';

interface Tab {
  key: string;
  label: string;
}

interface UnderlineTabsProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

// Tabs com sublinhado da web (GroupDetail): borda inferior na fileira,
// aba ativa com sublinhado accent de 2px.
export function UnderlineTabs({ tabs, active, onChange }: UnderlineTabsProps) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChange(tab.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: -1,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.accent },
  label: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: fontSize.sm,
  },
  labelActive: {
    color: colors.ink,
    fontFamily: fonts.sansSemiBold,
  },
});
