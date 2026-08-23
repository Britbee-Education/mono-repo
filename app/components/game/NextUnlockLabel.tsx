import { Text, type TextProps, type TextStyle } from "react-native";
import { unlockCountdownLabel, type UnlockCountdownKind } from "@/lib/day";
import { useIstDayCountdown } from "@/lib/useIstDayCountdown";

type Props = TextProps & {
  kind?: UnlockCountdownKind;
  style?: TextStyle;
};

/** Live reverse timer until the next IST day unlocks. */
export function NextUnlockLabel({ kind = "default", style, ...rest }: Props) {
  const ms = useIstDayCountdown();
  return (
    <Text style={style} {...rest}>
      {unlockCountdownLabel(ms, kind)}
    </Text>
  );
}
