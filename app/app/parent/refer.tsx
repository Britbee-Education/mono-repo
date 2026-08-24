import { useCallback, useEffect, useState } from "react";
import { Redirect } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  Share,
  Alert,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ParentShell } from "@/components/parent/ParentShell";
import { Card } from "@/components/ui/Card";
import { PillButton } from "@/components/ui/PillButton";
import { useParent } from "@/context/ParentContext";
import { useAuth } from "@/context/AuthContext";
import { api, isApiError, type ReferralMe } from "@/lib/api";
import { colors, fonts } from "@/constants/theme";

export default function ParentReferScreen() {
  const { unlocked } = useParent();
  const { user } = useAuth();
  const [me, setMe] = useState<ReferralMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimCode, setClaimCode] = useState("");
  const [claiming, setClaiming] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await api.referralMe();
      setMe(data);
    } catch (e) {
      if (!isApiError(e) || e.status !== 401) {
        Alert.alert("Referrals", e instanceof Error ? e.message : "Could not load referrals.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) void refresh();
  }, [unlocked, refresh]);

  if (!unlocked) return <Redirect href="/parent" />;

  async function shareCode() {
    if (!me) return;
    try {
      await Share.share({ message: me.shareText });
    } catch {
      /* dismissed */
    }
  }

  async function applyCode() {
    if (!claimCode.trim()) return;
    setClaiming(true);
    try {
      const data = await api.referralClaim(claimCode.trim());
      setMe(data.me);
      setClaimCode("");
      Alert.alert("Welcome bonus!", "Buzz Points and your plan discount are ready.");
    } catch (e) {
      Alert.alert("Referral", isApiError(e) ? e.message : "Could not apply that code.");
    } finally {
      setClaiming(false);
    }
  }

  const wallet = me?.wallet;
  const rewards = me?.rewards;

  return (
    <ParentShell title="Refer & earn">
      {loading || !me ? (
        <ActivityIndicator color={colors.navy} style={{ marginTop: 40 }} />
      ) : (
        <>
          <Card>
            <Text style={styles.kicker}>Your family code</Text>
            <Text style={styles.code}>{me.code}</Text>
            <Text style={styles.hint}>
              Share with friends, neighbours, classmates’ parents, or siblings. When they join BritBee, you both
              earn Buzz Points and membership discounts.
            </Text>
            <View style={styles.row}>
              <PillButton label="Share invite" onPress={() => void shareCode()} style={{ flex: 1 }} />
            </View>
          </Card>

          <Card>
            <Text style={styles.section}>Rewards</Text>
            <View style={styles.statRow}>
              <Stat label="Families joined" value={String(wallet?.totalReferrals || 0)} />
              <Stat label="Buzz earned" value={`+${wallet?.buzzEarned || 0}`} />
              <Stat label="Plan discount" value={`${wallet?.nextDiscountPct || 0}%`} />
            </View>
            <Text style={styles.detail}>
              You get +{rewards?.referrerBuzz} Buzz and +{rewards?.referrerDiscountPer}% off (up to{" "}
              {rewards?.referrerDiscountCap}%) for each successful join. New families get +{rewards?.referredBuzz}{" "}
              Buzz and {rewards?.referredWelcomeDiscount}% off their first paid plan.
            </Text>
            {me.checkoutDiscountPct > 0 ? (
              <View style={styles.banner}>
                <Ionicons name="pricetag" size={16} color={colors.navy} />
                <Text style={styles.bannerTxt}>
                  {me.checkoutDiscountPct}% off is ready on your next BritBee Pay checkout.
                </Text>
              </View>
            ) : null}
          </Card>

          <Card>
            <Text style={styles.section}>Got a friend’s code?</Text>
            <Text style={styles.hint}>Enter it once if you haven’t already claimed a welcome bonus.</Text>
            <TextInput
              value={claimCode}
              onChangeText={setClaimCode}
              autoCapitalize="characters"
              placeholder="BRITXXXX"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <PillButton
              label={claiming ? "Applying…" : "Apply code"}
              onPress={() => void applyCode()}
              disabled={claiming || !claimCode.trim()}
            />
          </Card>

          <Text style={styles.section}>Who you invited</Text>
          {me.claims.length ? (
            me.claims.map((c) => (
              <View key={c.id} style={styles.claimRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.claimName}>{c.referredName}</Text>
                  <Text style={styles.claimSub}>
                    {c.referredChild ? `${c.referredChild} · ` : ""}
                    {c.status === "rewarded" ? "Rewarded" : c.status}
                    {` · +${c.referrerBuzz} Buzz`}
                  </Text>
                </View>
                <Text style={styles.claimPct}>+{c.referrerDiscountPct}%</Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>No invites yet — share your code to grow the hive.</Text>
          )}

          <Text style={styles.footer}>
            Mentors can see every referral in Office. Signed in as {user?.name || "parent"}.
          </Text>
        </>
      )}
    </ParentShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statVal}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, letterSpacing: 0.6 },
  code: {
    marginTop: 8,
    fontFamily: fonts.extra,
    color: colors.navy,
    fontSize: 28,
    letterSpacing: 2,
  },
  hint: { marginTop: 8, fontFamily: fonts.medium, color: colors.ink, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: "row", marginTop: 14 },
  section: { fontFamily: fonts.extra, color: colors.navy, fontSize: 15, marginBottom: 8, marginTop: 4 },
  statRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  stat: {
    flex: 1,
    backgroundColor: "#F4F7FC",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  statVal: { fontFamily: fonts.extra, color: colors.navy, fontSize: 18 },
  statLabel: { fontFamily: fonts.medium, color: colors.muted, fontSize: 10, marginTop: 2, textAlign: "center" },
  detail: { fontFamily: fonts.medium, color: colors.ink, fontSize: 12, lineHeight: 17 },
  banner: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF6D6",
    borderRadius: 12,
    padding: 10,
  },
  bannerTxt: { flex: 1, fontFamily: fonts.bold, color: colors.navy, fontSize: 12 },
  input: {
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E6E8EE",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontFamily: fonts.bold,
    color: colors.navy,
    fontSize: 16,
    letterSpacing: 1,
    backgroundColor: colors.white,
  },
  claimRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    padding: 12,
    marginBottom: 8,
  },
  claimName: { fontFamily: fonts.extra, color: colors.navy, fontSize: 14 },
  claimSub: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11, marginTop: 2 },
  claimPct: { fontFamily: fonts.extra, color: colors.speak, fontSize: 13 },
  empty: { fontFamily: fonts.medium, color: colors.muted, fontSize: 13, marginBottom: 12 },
  footer: { marginTop: 8, marginBottom: 24, fontFamily: fonts.medium, color: colors.muted, fontSize: 11 },
});
