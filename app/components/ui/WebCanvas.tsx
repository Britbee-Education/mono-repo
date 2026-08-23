import { View, StyleSheet } from "react-native";
import { colors, radii, shadow } from "@/constants/theme";
import { useLayout } from "@/lib/layout";

export function WebCanvas({ children }: { children: React.ReactNode }) {
  const { web, framed, canvasMax, stagePad } = useLayout();
  if (!web) return <>{children}</>;

  return (
    <View style={[styles.stage, framed && styles.stageWide, framed && { paddingVertical: stagePad }]}>
      <View
        style={[
          styles.hive,
          framed && {
            maxWidth: canvasMax,
            borderRadius: stagePad ? radii.card + 4 : 0,
            overflow: "hidden",
            ...shadow.raised,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  stageWide: {
    backgroundColor: "#E4E9F2",
    alignItems: "center",
  },
  hive: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.bg,
    minHeight: 0,
  },
});
