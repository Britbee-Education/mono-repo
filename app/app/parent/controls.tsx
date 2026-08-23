import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View, Text, StyleSheet, Switch, TextInput, Alert, ScrollView } from "react-native";
import { ParentShell } from "@/components/parent/ParentShell";
import { Card } from "@/components/ui/Card";
import { PillButton } from "@/components/ui/PillButton";
import { useParent } from "@/context/ParentContext";
import { useAuth } from "@/context/AuthContext";
import { useNotify } from "@/context/NotifyContext";
import { colors, fonts, radii } from "@/constants/theme";
import { api, type ChildProfile } from "@/lib/api";
import { ChildLevels } from "@britbee/shared";

export default function ParentControlsScreen() {
  const { unlocked, paused, setPaused, setPin } = useParent();
  const { user, updateProfile, setUser } = useAuth();
  const { enabled: notify, setEnabled: setNotify } = useNotify();
  const [tab, setTab] = useState<"kids" | "settings" | "pin">("kids");
  const [children, setChildren] = useState<ChildProfile[]>(user?.children || (user?.child ? [user.child as any] : []));
  const [activeChildIndex, setActiveChildIndex] = useState<number>(user?.activeChildIndex ?? 0);
  const activeChild = children[activeChildIndex] || user?.child || null;

  const [name, setName] = useState<string>(activeChild?.childName || "");
  const [level, setLevel] = useState<ChildProfile["level"]>(activeChild?.level || "beginner");
  const [goal, setGoal] = useState<string>(activeChild?.goal || "");

  const [pin, setPinValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [loadBusy, setLoadBusy] = useState(false);

  const [adding, setAdding] = useState(false);
  const [newChildName, setNewChildName] = useState("");
  const [newChildLevel, setNewChildLevel] = useState<ChildProfile["level"]>("beginner");
  const [newChildGoal, setNewChildGoal] = useState("");

  if (!unlocked) return <Redirect href="/parent" />;

  useEffect(() => {
    let mounted = true;
    setLoadBusy(true);
    api.parentChildren()
      .then((res) => {
        if (!mounted) return;
        setChildren(res.children || []);
        setActiveChildIndex(res.activeChildIndex ?? 0);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!mounted) return;
        setLoadBusy(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setName(activeChild?.childName || "");
    setLevel(activeChild?.level || "beginner");
    setGoal(activeChild?.goal || "");
  }, [activeChildIndex, children]);

  async function saveChild() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert("Name needed", "Enter your child’s name.");
      return;
    }
    setBusy(true);
    try {
      if (children.length) {
        await api.parentUpdateChild(activeChildIndex, {
          childName: trimmed,
          level,
          goal,
        });
        const res = await api.parentChildren();
        setChildren(res.children || []);
        setActiveChildIndex(res.activeChildIndex ?? 0);
        const me = await api.me();
        if (me) setUser(me);
      } else {
        // Fallback for accounts that haven't upgraded to multi-child storage yet.
        await updateProfile({ child: { ...(user?.child || {}), childName: trimmed, level, goal } });
      }
      Alert.alert("Saved", "Child profile updated.");
    } catch (e) {
      Alert.alert("Could not save", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function switchToChild(idx: number) {
    if (!children.length) return;
    setLoadBusy(true);
    try {
      await api.parentSetActiveChild(idx);
      const res = await api.parentChildren();
      setChildren(res.children || []);
      setActiveChildIndex(res.activeChildIndex ?? idx);
      const me = await api.me();
      if (me) setUser(me);
    } catch (e) {
      Alert.alert("Could not switch child", e instanceof Error ? e.message : "Try again.");
    } finally {
      setLoadBusy(false);
    }
  }

  async function addChild() {
    const trimmed = newChildName.trim();
    if (!trimmed) {
      Alert.alert("Name needed", "Enter the new child name.");
      return;
    }
    setBusy(true);
    try {
      await api.parentAddChild({ childName: trimmed, level: newChildLevel, goal: newChildGoal });
      const me = await api.me();
      if (me) setUser(me);
      const res = await api.parentChildren();
      setChildren(res.children || []);
      setActiveChildIndex(res.activeChildIndex ?? 0);
      setAdding(false);
      setNewChildName("");
      setNewChildLevel("beginner");
      setNewChildGoal("");
    } catch (e) {
      Alert.alert("Could not add child", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function savePin() {
    if (pin.length !== 4) {
      Alert.alert("4 digits", "Choose a 4-digit parent PIN.");
      return;
    }
    await setPin(pin);
    setPinValue("");
    Alert.alert("PIN updated", "Use this PIN to open Parent Access.");
  }

  return (
    <ParentShell title="Parental controls">
      <Card>
        <View style={styles.tabRow}>
          <PillButton
            label="Kids"
            variant={tab === "kids" ? "navy" : "outline"}
            onPress={() => setTab("kids")}
            disabled={false}
            style={styles.tabPill}
          />
          <PillButton
            label="Settings"
            variant={tab === "settings" ? "navy" : "outline"}
            onPress={() => setTab("settings")}
            disabled={false}
            style={styles.tabPill}
          />
          <PillButton
            label="Parent PIN"
            variant={tab === "pin" ? "navy" : "outline"}
            onPress={() => setTab("pin")}
            disabled={false}
            style={styles.tabPill}
          />
        </View>
      </Card>

      {tab === "kids" ? (
        <>
          <Text style={styles.section}>Kids</Text>
          <Card>
            <Text style={styles.label}>Choose who we’re helping</Text>
            {children.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={styles.childRow}>
                  {children.map((c, idx) => {
                    const on = idx === activeChildIndex;
                    return (
                      <PillButton
                        key={idx}
                        label={c.childName || "Kid"}
                        variant={on ? "navy" : "outline"}
                        onPress={() => void switchToChild(idx)}
                        disabled={loadBusy}
                        style={on ? styles.childPillOn : styles.childPillOff}
                      />
                    );
                  })}
                </View>
              </ScrollView>
            ) : (
              <Text style={styles.hint}>No kids found yet. Add a sibling below.</Text>
            )}

            <View style={styles.divider} />

            <Text style={styles.label}>Kid profile</Text>
            <Text style={styles.smallLabel}>Name</Text>
            <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="e.g., Arjun" />

            <Text style={styles.smallLabel}>Skill level</Text>
            <View style={styles.levelRow}>
              {ChildLevels.map((l) => {
                const on = level === l;
                return (
                  <PillButton
                    key={l}
                    label={l[0].toUpperCase() + l.slice(1)}
                    variant={on ? "navy" : "outline"}
                    onPress={() => setLevel(l)}
                    disabled={busy || loadBusy}
                    style={on ? styles.levelPillOn : styles.levelPillOff}
                  />
                );
              })}
            </View>

            <Text style={styles.smallLabel}>Practice wish (optional)</Text>
            <TextInput value={goal} onChangeText={setGoal} style={styles.input} placeholder="e.g., Speak confidently" />

            <PillButton
              label="Save kid profile"
              variant="navy"
              loading={busy}
              onPress={() => void saveChild()}
              disabled={loadBusy}
            />

            <View style={{ marginTop: 14 }}>
              <PillButton
                label={adding ? "Cancel" : "Add a sibling"}
                variant="outline"
                onPress={() => {
                  setAdding((v) => !v);
                  setNewChildName("");
                  setNewChildLevel("beginner");
                  setNewChildGoal("");
                }}
                disabled={busy || loadBusy}
              />
            </View>

            {adding ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.smallLabel}>Sibling name</Text>
                <TextInput value={newChildName} onChangeText={setNewChildName} style={styles.input} placeholder="Kid name" />
                <Text style={styles.smallLabel}>Sibling skill level</Text>
                <View style={styles.levelRow}>
                  {ChildLevels.map((l) => {
                    const on = newChildLevel === l;
                    return (
                      <PillButton
                        key={l}
                        label={l[0].toUpperCase() + l.slice(1)}
                        variant={on ? "navy" : "outline"}
                        onPress={() => setNewChildLevel(l)}
                        disabled={busy || loadBusy}
                        style={on ? styles.levelPillOn : styles.levelPillOff}
                      />
                    );
                  })}
                </View>
                <Text style={styles.smallLabel}>Practice wish (optional)</Text>
                <TextInput
                  value={newChildGoal}
                  onChangeText={setNewChildGoal}
                  style={styles.input}
                  placeholder="e.g., Speak confidently"
                />
                <PillButton
                  label="Add sibling"
                  variant="navy"
                  loading={busy}
                  onPress={() => void addChild()}
                  disabled={loadBusy}
                />
              </View>
            ) : null}
          </Card>
        </>
      ) : null}

      {tab === "settings" ? (
        <>
          <Text style={styles.section}>Settings</Text>
          <Card>
            <View style={styles.row}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>Pause practice</Text>
                <Text style={styles.rowSub}>Stops activities until you turn it back on.</Text>
              </View>
              <Switch
                value={paused}
                onValueChange={(v) => void setPaused(v)}
                trackColor={{ false: colors.border, true: colors.yellow }}
                thumbColor={colors.white}
              />
            </View>
            <View style={[styles.row, styles.rowTop]}>
              <View style={styles.rowLeft}>
                <Text style={styles.rowTitle}>Class notifications</Text>
                <Text style={styles.rowSub}>Hive messages and live class alerts.</Text>
              </View>
              <Switch
                value={notify}
                onValueChange={(v) => void setNotify(v)}
                trackColor={{ false: colors.border, true: colors.yellow }}
                thumbColor={colors.white}
              />
            </View>
          </Card>
        </>
      ) : null}

      {tab === "pin" ? (
        <>
          <Text style={styles.section}>Parent PIN</Text>
          <Card>
            <Text style={styles.label}>New 4-digit PIN</Text>
            <TextInput
              value={pin}
              onChangeText={(t) => setPinValue(t.replace(/\D/g, "").slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              style={styles.input}
              placeholder="••••"
              placeholderTextColor={colors.muted}
            />
            <PillButton label="Update PIN" variant="outline" onPress={() => void savePin()} />
          </Card>
        </>
      ) : null}
    </ParentShell>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowTop: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#EEF1F6" },
  rowLeft: { flex: 1, minWidth: 0 },
  rowTitle: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15 },
  rowSub: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginTop: 2 },
  section: { marginTop: 22, marginBottom: 4, fontFamily: fonts.bold, color: colors.navy, fontSize: 14 },
  label: { fontFamily: fonts.semi, color: colors.navy, marginBottom: 6, fontSize: 13 },
  smallLabel: { fontFamily: fonts.semi, color: colors.navy, marginTop: 10, marginBottom: 6, fontSize: 13 },
  hint: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginBottom: 10 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.input,
    height: 48,
    paddingHorizontal: 12,
    fontFamily: fonts.regular,
    color: colors.navy,
    fontSize: 15,
    marginBottom: 12,
    backgroundColor: colors.white,
  },
  divider: { height: 1, backgroundColor: "#EEF1F6", marginVertical: 10 },
  childRow: { flexDirection: "row", gap: 10, paddingRight: 6 },
  // Smaller "chips" for the child picker.
  tabRow: { flexDirection: "row", gap: 10, justifyContent: "space-between" },
  tabPill: { height: 42, paddingHorizontal: 12 },
  childPillOn: { backgroundColor: colors.navy, height: 42, paddingHorizontal: 10 },
  childPillOff: { height: 42, paddingHorizontal: 10 },
  levelRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  levelPillOn: { backgroundColor: colors.navy, height: 42, paddingHorizontal: 12 },
  levelPillOff: { height: 42, paddingHorizontal: 12 },
});
