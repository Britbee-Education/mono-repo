import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
  Share,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "@/components/ui/Card";
import { PillButton } from "@/components/ui/PillButton";
import { BouncePress } from "@/components/game/BouncePress";
import {
  api,
  isApiError,
  type BillingGatewaySession,
  type BillingPayment,
} from "@/lib/api";
import { formatInr } from "@/lib/billing";
import { colors, fonts } from "@/constants/theme";

type Props = {
  payment: BillingPayment;
  busy?: boolean;
  onBusy?: (next: boolean) => void;
  onSubmitted: () => void;
  onCancel: () => void;
};

export function BritBeePayPanel({ payment, busy, onBusy, onSubmitted, onCancel }: Props) {
  const [session, setSession] = useState<BillingGatewaySession | null>(null);
  const [loading, setLoading] = useState(true);
  const [txnId, setTxnId] = useState(payment.transactionId || "");
  const [proofUrl, setProofUrl] = useState(payment.proofUrl || "");
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const waiting = payment.status === "processing" || Boolean(payment.submittedAt);

  useEffect(() => {
    if (!waiting) return;
    const id = setInterval(() => onSubmitted(), 12_000);
    return () => clearInterval(id);
  }, [waiting, onSubmitted]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const data = await api.billingGatewaySession(payment.id);
        if (alive) setSession(data);
      } catch (e) {
        if (alive) Alert.alert("Gateway error", isApiError(e) ? e.message : "Could not load BritBee Pay.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [payment.id]);

  async function shareVpa() {
    const vpa = session?.gateway.upiVpa;
    if (!vpa) return;
    try {
      await Share.share({ message: vpa, title: "UPI ID" });
    } catch {
      Alert.alert("UPI ID", vpa);
    }
  }

  async function openUpiApp() {
    const intent = session?.upiIntent;
    if (!intent) return;
    try {
      await Linking.openURL(intent);
    } catch {
      Alert.alert("Open GPay", "Scan the QR with GPay / PhonePe, or pay to the UPI ID shown above.");
    }
  }

  async function pickScreenshot() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to upload your payment screenshot.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPreviewUri(asset.uri);
    onBusy?.(true);
    try {
      const form = new FormData();
      const name = asset.fileName || `payment-proof-${Date.now()}.jpg`;
      if (Platform.OS === "web") {
        const blob = await (await fetch(asset.uri)).blob();
        form.append("file", blob, name);
      } else {
        form.append("file", {
          uri: asset.uri,
          name,
          type: asset.mimeType || "image/jpeg",
        } as unknown as Blob);
      }
      const uploaded = await api.billingUploadProof(payment.id, form);
      setProofUrl(uploaded.proofUrl);
    } catch (e) {
      setPreviewUri(null);
      Alert.alert("Upload failed", isApiError(e) ? e.message : "Try another image.");
    } finally {
      onBusy?.(false);
    }
  }

  async function submit() {
    if (waiting) {
      onSubmitted();
      return;
    }
    if (!txnId.trim() && !proofUrl) {
      Alert.alert("Almost there", "Enter your UPI transaction ID or upload a payment screenshot.");
      return;
    }
    onBusy?.(true);
    try {
      await api.billingSubmitProof(payment.id, {
        transactionId: txnId.trim() || undefined,
        proofUrl: proofUrl || undefined,
      });
      Alert.alert(
        "Submitted for activation",
        "BritBee Pay received your proof. A mentor will verify and activate your plan — usually within a few hours."
      );
      onSubmitted();
    } catch (e) {
      Alert.alert("Could not submit", isApiError(e) ? e.message : "Try again.");
    } finally {
      onBusy?.(false);
    }
  }

  if (loading || !session) {
    return (
      <Card>
        <ActivityIndicator color={colors.navy} />
        <Text style={styles.hint}>Opening BritBee Pay…</Text>
      </Card>
    );
  }

  const g = session.gateway;

  return (
    <Card style={styles.wrap}>
      <View style={styles.brandRow}>
        <View style={styles.brandMark}>
          <Ionicons name="shield-checkmark" size={18} color={colors.navy} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.brand}>{g.displayName}</Text>
          <Text style={styles.secure}>Secure UPI checkout · Order {payment.orderRef || payment.id}</Text>
        </View>
        {waiting ? (
          <View style={styles.waitPill}>
            <Text style={styles.waitPillText}>Under review</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.amountBox}>
        <Text style={styles.amountLabel}>Amount payable</Text>
        <Text style={styles.amount}>{session.amountLabel || formatInr(payment.amount)}</Text>
        {payment.discountPct && payment.originalAmount ? (
          <Text style={styles.discountNote}>
            {payment.discountLabel || `${payment.discountPct}% referral off`} · was{" "}
            {formatInr(payment.originalAmount)}
          </Text>
        ) : null}
        <Text style={styles.plan}>{session.planLabel}</Text>
      </View>

      {waiting ? (
        <View style={styles.waitBox}>
          <Ionicons name="hourglass-outline" size={22} color="#B45309" />
          <Text style={styles.waitTitle}>Waiting for mentor activation</Text>
          <Text style={styles.hint}>
            {payment.transactionId ? `Txn ${payment.transactionId}` : "Screenshot received"}
            {" · "}
            {g.supportNote}
          </Text>
        </View>
      ) : (
        <>
          <Text style={styles.step}>1. Pay with GPay / UPI</Text>
          <View style={styles.qrCard}>
            <Image source={{ uri: session.qrImageUrl }} style={styles.qr} />
            <Text style={styles.vpa}>{g.upiVpa}</Text>
            <Text style={styles.payee}>{g.payeeName}</Text>
            <View style={styles.rowActions}>
              <BouncePress sound={false} onPress={() => void shareVpa()} style={styles.miniBtn}>
                <Ionicons name="copy-outline" size={16} color={colors.navy} />
                <Text style={styles.miniBtnText}>Share UPI ID</Text>
              </BouncePress>
              <BouncePress sound={false} onPress={() => void openUpiApp()} style={styles.miniBtn}>
                <Ionicons name="phone-portrait-outline" size={16} color={colors.navy} />
                <Text style={styles.miniBtnText}>Open UPI app</Text>
              </BouncePress>
            </View>
          </View>
          <Text style={styles.hint}>{g.instructions}</Text>

          <Text style={styles.step}>2. Confirm your payment</Text>
          <Text style={styles.fieldLabel}>UPI transaction ID</Text>
          <TextInput
            value={txnId}
            onChangeText={setTxnId}
            placeholder="e.g. 312345678901"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            style={styles.input}
          />
          <Text style={styles.or}>or</Text>
          <BouncePress sound={false} onPress={() => void pickScreenshot()} style={styles.upload}>
            <Ionicons name="image-outline" size={20} color={colors.navy} />
            <Text style={styles.uploadText}>
              {proofUrl || previewUri ? "Screenshot attached — tap to change" : "Upload payment screenshot"}
            </Text>
          </BouncePress>
          {previewUri || proofUrl ? <Image source={{ uri: previewUri || proofUrl }} style={styles.preview} /> : null}
        </>
      )}

      <View style={{ marginTop: 14, gap: 8 }}>
        {!waiting ? (
          <PillButton label="Submit for activation" variant="navy" loading={busy} onPress={() => void submit()} />
        ) : null}
        {payment.status === "pending" && !waiting ? (
          <PillButton label="Cancel payment" variant="outline" loading={busy} onPress={onCancel} />
        ) : null}
        {waiting ? <PillButton label="Refresh status" variant="outline" loading={busy} onPress={onSubmitted} /> : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  brandMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.yellow,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: { fontFamily: fonts.extra, color: colors.navy, fontSize: 18 },
  secure: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11, marginTop: 2 },
  waitPill: { backgroundColor: "#FEF3C7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  waitPillText: { fontFamily: fonts.bold, color: "#B45309", fontSize: 11 },
  amountBox: {
    backgroundColor: "#F7F9FF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E6EAF5",
    marginBottom: 10,
  },
  amountLabel: { fontFamily: fonts.bold, color: colors.muted, fontSize: 11, letterSpacing: 0.6 },
  amount: { fontFamily: fonts.extra, color: colors.navy, fontSize: 28, marginTop: 4 },
  discountNote: { fontFamily: fonts.medium, color: colors.listen, fontSize: 12, marginTop: 4 },
  plan: { fontFamily: fonts.medium, color: colors.ink, fontSize: 13, marginTop: 2 },
  step: { fontFamily: fonts.bold, color: colors.navy, fontSize: 13, marginTop: 12, marginBottom: 8 },
  qrCard: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EEF1F6",
    padding: 16,
  },
  qr: { width: 200, height: 200, borderRadius: 8, backgroundColor: "#F4F6FB" },
  vpa: { marginTop: 12, fontFamily: fonts.extra, color: colors.navy, fontSize: 16 },
  payee: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, marginTop: 2 },
  rowActions: { flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap", justifyContent: "center" },
  miniBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F7F9FF",
    borderWidth: 1,
    borderColor: "#E6EAF5",
  },
  miniBtnText: { fontFamily: fonts.bold, color: colors.navy, fontSize: 12 },
  hint: { fontFamily: fonts.medium, color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  fieldLabel: { fontFamily: fonts.bold, color: colors.navy, fontSize: 12, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: "#E6EAF5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.medium,
    color: colors.navy,
    fontSize: 15,
    backgroundColor: colors.white,
  },
  or: { textAlign: "center", fontFamily: fonts.bold, color: colors.muted, fontSize: 12, marginVertical: 10 },
  upload: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: colors.navy,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 14,
    backgroundColor: "#F7F9FF",
  },
  uploadText: { flex: 1, fontFamily: fonts.bold, color: colors.navy, fontSize: 13 },
  preview: { marginTop: 10, width: "100%", height: 160, borderRadius: 12, backgroundColor: "#F4F6FB" },
  waitBox: {
    marginTop: 8,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    gap: 6,
  },
  waitTitle: { fontFamily: fonts.extra, color: "#B45309", fontSize: 15 },
});
