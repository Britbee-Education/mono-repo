import { useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, type ViewToken } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LearnReel } from "@/components/learn/LearnReel";
import { EmptyBee } from "@/components/ui/EmptyBee";
import { api, type LearnClip } from "@/lib/api";
import { stopSpeaking } from "@/lib/speech";
import { colors, fonts } from "@/constants/theme";

export default function LearnScreen() {
  const listRef = useRef<FlatList<LearnClip>>(null);
  const [clips, setClips] = useState<LearnClip[]>([]);
  const [seen, setSeen] = useState<string[]>([]);
  const [pageH, setPageH] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [focused, setFocused] = useState(true);
  const activeRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const data = await api.learn();
    const rows = data.clips || [];
    setClips(rows);
    setSeen(data.seenIds || []);
    const firstId = rows[0]?.id || null;
    activeRef.current = firstId;
    setActiveId(firstId);
    setActiveIdx(0);
    if (firstId) listRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      void load();
      return () => {
        setFocused(false);
        stopSpeaking();
      };
    }, [load])
  );

  const onSeen = useCallback((id: string) => {
    setSeen((prev) => (prev.includes(id) ? prev : [id, ...prev]));
    void api.learnSeen(id);
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const next = String(viewableItems[0]?.item?.id || "");
    if (!next || next === activeRef.current) return;
    activeRef.current = next;
    setActiveId(next);
    const idx = clips.findIndex((c) => c.id === next);
    if (idx >= 0) setActiveIdx(idx);
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 70 }).current;
  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      if (!pageH) return;
      const idx = Math.round(e.nativeEvent.contentOffset.y / pageH);
      const next = clips[idx]?.id;
      if (next) {
        activeRef.current = next;
        setActiveId(next);
        setActiveIdx(idx);
      }
    },
    [clips, pageH]
  );

  const jumpTo = useCallback(
    (idx: number) => {
      if (!clips.length) return;
      const safe = Math.max(0, Math.min(clips.length - 1, idx));
      listRef.current?.scrollToIndex({ index: safe, animated: true });
      const id = clips[safe]?.id;
      if (id) {
        activeRef.current = id;
        setActiveId(id);
        setActiveIdx(safe);
      }
    },
    [clips]
  );

  return (
    <View style={styles.root} onLayout={(e) => setPageH(e.nativeEvent.layout.height)}>
      {pageH > 0 && clips.length ? (
        <FlatList
          ref={listRef}
          data={clips}
          keyExtractor={(item) => item.id}
          pagingEnabled
          snapToInterval={pageH || undefined}
          snapToAlignment="start"
          disableIntervalMomentum
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          scrollEventThrottle={16}
          initialNumToRender={1}
          windowSize={3}
          maxToRenderPerBatch={2}
          removeClippedSubviews
          getItemLayout={(_, index) => ({ length: pageH, offset: pageH * index, index })}
          onViewableItemsChanged={onViewableItemsChanged}
          onMomentumScrollEnd={onMomentumScrollEnd as any}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item }) => (
            <LearnReel
              clip={item}
              active={focused && item.id === activeId}
              seen={seen.includes(item.id)}
              height={pageH}
              onSeen={onSeen}
            />
          )}
        />
      ) : (
        <View style={styles.empty}>
          <EmptyBee
            title="E-Learn is waking up"
            message="Short English bites from your mentor will land here."
            size={110}
          />
        </View>
      )}
      {clips.length > 1 && activeId === clips[0]?.id ? (
        <View style={[styles.hint, { top: 18 }]} pointerEvents="none">
          <Ionicons name="chevron-up" size={16} color={colors.white} />
          <Text style={styles.hintTxt}>Swipe up</Text>
        </View>
      ) : null}
      {clips.length > 1 ? (
        <View style={styles.navWrap} pointerEvents="box-none">
          <BounceNav
            icon="chevron-up"
            disabled={activeIdx <= 0}
            onPress={() => jumpTo(activeIdx - 1)}
            label="Prev"
          />
          <BounceNav
            icon="chevron-down"
            disabled={activeIdx >= clips.length - 1}
            onPress={() => jumpTo(activeIdx + 1)}
            label="Next"
          />
        </View>
      ) : null}
    </View>
  );
}

function BounceNav({
  icon,
  onPress,
  disabled,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <View style={[styles.navBtn, disabled && styles.navBtnDisabled]}>
      <Ionicons name={icon} size={18} color={disabled ? "rgba(255,255,255,0.35)" : colors.white} onPress={disabled ? undefined : onPress} />
      <Text style={[styles.navTxt, disabled && styles.navTxtDisabled]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.navyDeep },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 8 },
  emptyTitle: { fontFamily: fonts.extra, fontSize: 22, color: colors.white, textAlign: "center" },
  emptySub: { fontFamily: fonts.medium, fontSize: 14, color: "rgba(255,255,255,0.72)", textAlign: "center", lineHeight: 20 },
  hint: {
    position: "absolute",
    top: 18,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(11,31,77,0.45)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  hintTxt: { fontFamily: fonts.bold, fontSize: 11, color: colors.white },
  navWrap: {
    position: "absolute",
    right: 14,
    top: "42%",
    gap: 10,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(11,31,77,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  navBtnDisabled: { opacity: 0.45 },
  navTxt: { fontFamily: fonts.bold, fontSize: 8, color: colors.white },
  navTxtDisabled: { color: "rgba(255,255,255,0.5)" },
});
