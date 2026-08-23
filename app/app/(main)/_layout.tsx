import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useNotify } from "@/context/NotifyContext";
import { colors, fonts, shadow } from "@/constants/theme";
import { MainHeader } from "@/components/hive/MainHeader";

function TabIcon({
  name,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconOn]}>
      <Ionicons name={name} size={20} color={focused ? colors.navy : "#9AA3B5"} />
    </View>
  );
}

export default function MainLayout() {
  const { unread } = useNotify();
  const badge = unread > 0 ? (unread > 9 ? "9+" : unread) : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        header: () => <MainHeader />,
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: "#9AA3B5",
        tabBarLabelStyle: styles.label,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Activities",
          tabBarIcon: ({ focused }) => <TabIcon name="sparkles" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "E-Learn",
          tabBarIcon: ({ focused }) => <TabIcon name="play" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="social"
        options={{
          title: "Social",
          tabBarIcon: ({ focused }) => <TabIcon name="chatbubbles" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="classes"
        options={{
          title: "Classes",
          tabBarBadge: badge,
          tabBarBadgeStyle: styles.badge,
          tabBarIcon: ({ focused }) => <TabIcon name="calendar" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />,
        }}
      />
      {/* Explicitly disable leaderboard tab (header chip still navigates to /(main)/leaderboard). */}
      <Tabs.Screen name="leaderboard" options={{ href: null }} />
      <Tabs.Screen name="inbox" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: "#FFFDF8",
    borderTopWidth: 1,
    borderTopColor: "#EEE8DC",
    paddingTop: 6,
    ...shadow.bar,
  },
  item: { paddingTop: 2 },
  label: { fontFamily: fonts.bold, fontSize: 9, marginTop: 2 },
  iconWrap: {
    width: 36,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOn: { backgroundColor: colors.yellow },
  badge: {
    backgroundColor: colors.nameRed,
    color: colors.white,
    fontFamily: fonts.extra,
    fontSize: 10,
    minWidth: 16,
    height: 16,
    lineHeight: 16,
    top: 4,
  },
});
