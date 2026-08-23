import { View, StyleSheet, type ViewStyle } from "react-native";
import { colors, radii, shadow } from "@/constants/theme";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    ...shadow.card,
  },
});
