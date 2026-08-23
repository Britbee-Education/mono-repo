import { View, Text, TextInput, StyleSheet, Pressable } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { colors, fonts, radii } from "@/constants/theme";
import { motion } from "@/lib/motion";

type Props = {
  label?: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  right?: React.ReactNode;
};

export function AuthInput({
  label,
  placeholder,
  value,
  onChangeText,
  icon,
  secure,
  keyboardType = "default",
  right,
}: Props) {
  const [show, setShow] = useState(false);
  const focus = useSharedValue(0);
  const field = useAnimatedStyle(() => ({
    borderColor: interpolateColor(focus.value, [0, 1], [colors.border, colors.navy]),
  }));

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Animated.View style={[styles.field, field]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.navy} style={styles.leftIcon} /> : null}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure && !show}
          keyboardType={keyboardType}
          autoCapitalize="none"
          onFocus={() => {
            focus.value = withTiming(1, motion.quick);
          }}
          onBlur={() => {
            focus.value = withTiming(0, motion.quick);
          }}
        />
        {secure ? (
          <Pressable onPress={() => setShow((s) => !s)} hitSlop={8}>
            <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={18} color={colors.muted} />
          </Pressable>
        ) : (
          right
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontFamily: fonts.semi, color: colors.navy, marginBottom: 6, fontSize: 13 },
  field: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.input,
    paddingHorizontal: 14,
    height: 52,
    backgroundColor: colors.white,
  },
  leftIcon: { marginRight: 10 },
  input: { flex: 1, fontFamily: fonts.regular, color: colors.navy, fontSize: 15, outlineStyle: "none", outlineWidth: 0 },
});
