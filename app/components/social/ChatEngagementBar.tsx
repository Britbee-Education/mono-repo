import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Platform,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BouncePress } from "@/components/game/BouncePress";
import {
  CHAT_CHEERS,
  type ChatCheer,
  type ChatSendPayload,
} from "@/lib/chatEngagement";
import type { AttachmentSource } from "@/lib/chatAttachments";
import { colors, fonts, radii, shadow } from "@/constants/theme";
import { useLayout } from "@/lib/layout";

type Props = {
  draft: string;
  onChangeDraft: (text: string) => void;
  placeholder: string;
  canSend: boolean;
  sending: boolean;
  recording: boolean;
  recordingHint?: string;
  disabled?: boolean;
  maxLength?: number;
  onSend: () => void;
  onCheer: (cheer: ChatCheer) => void;
  onAttachment: (source: AttachmentSource) => void;
  onInputFocus?: () => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
};

const ATTACH_OPTIONS: { id: AttachmentSource; label: string; sub: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "photo", label: "Photo", sub: "Gallery or camera roll", icon: "image-outline" },
  { id: "video", label: "Video", sub: "From gallery", icon: "videocam-outline" },
  { id: "document", label: "Document", sub: "PDF, Word, or file", icon: "document-outline" },
];

function AttachmentPicker({
  visible,
  onClose,
  onPick,
  disabled,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (source: AttachmentSource) => void;
  disabled?: boolean;
}) {
  const { web, framed, canvasMax } = useLayout();
  const webFrame = web && framed;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={[styles.sheetBackdrop, webFrame && styles.webModalBackdrop]} onPress={onClose}>
        <Pressable
          style={[styles.sheet, webFrame && { maxWidth: canvasMax, width: "100%", borderBottomLeftRadius: 18, borderBottomRightRadius: 18 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Send a file</Text>
          <View style={styles.attachList}>
            {ATTACH_OPTIONS.map((opt) => (
              <Pressable
                key={opt.id}
                disabled={disabled}
                onPress={() => {
                  onPick(opt.id);
                  onClose();
                }}
                style={styles.attachRow}
              >
                <View style={styles.attachIcon}>
                  <Ionicons name={opt.icon} size={22} color={colors.navy} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.attachLabel}>{opt.label}</Text>
                  <Text style={styles.attachSub}>{opt.sub}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function CheerPicker({
  visible,
  onClose,
  disabled,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  disabled?: boolean;
  onPick: (cheer: ChatCheer) => void;
}) {
  const { web, framed, canvasMax, padX } = useLayout();
  const webFrame = web && framed;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={[styles.cheerBackdrop, webFrame && styles.webModalBackdrop]}
        onPress={onClose}
      >
        <Pressable
          style={[
            styles.cheerSheet,
            webFrame && { maxWidth: canvasMax - padX * 2, width: "100%", alignSelf: "center" },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.cheerSheetTitle}>Send a cheer</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cheerRow}>
            {CHAT_CHEERS.map((cheer) => (
              <Pressable
                key={cheer.id}
                disabled={disabled}
                onPress={() => {
                  onPick(cheer);
                  onClose();
                }}
                style={styles.cheerPick}
              >
                <Text style={styles.cheerPickEmoji}>{cheer.emoji}</Text>
                <Text style={styles.cheerPickLabel}>{cheer.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function SocialChatComposer({
  draft,
  onChangeDraft,
  placeholder,
  canSend,
  sending,
  recording,
  recordingHint,
  disabled,
  maxLength = 120,
  onSend,
  onCheer,
  onAttachment,
  onInputFocus,
  onVoiceStart,
  onVoiceStop,
}: Props) {
  const [attachOpen, setAttachOpen] = useState(false);
  const [cheerOpen, setCheerOpen] = useState(false);

  return (
    <View style={styles.wrap}>
      <View style={styles.inputRow}>
        <View style={styles.fieldShell}>
          <Pressable
            disabled={disabled || recording}
            onPress={() => setAttachOpen(true)}
            style={({ pressed }) => [styles.inlineBtn, (attachOpen || pressed) && styles.inlineBtnOn]}
            hitSlop={6}
          >
            <Ionicons name="attach" size={19} color={attachOpen ? colors.navy : colors.muted} />
          </Pressable>

          {recording ? (
            <View style={styles.recRow}>
              <View style={styles.recDot} />
              <Text style={styles.recTxt} numberOfLines={1}>
                {recordingHint || "Listening…"}
              </Text>
            </View>
          ) : (
            <TextInput
              value={draft}
              onChangeText={onChangeDraft}
              placeholder={placeholder}
              placeholderTextColor={colors.muted}
              style={styles.input}
              maxLength={maxLength}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={onSend}
              onFocus={onInputFocus}
              editable={!sending && !recording}
            />
          )}

          <Pressable
            disabled={disabled || recording}
            onPress={() => setCheerOpen(true)}
            style={({ pressed }) => [styles.inlineBtn, (cheerOpen || pressed) && styles.inlineBtnOn]}
            hitSlop={6}
          >
            <Ionicons name="sparkles" size={18} color={cheerOpen ? colors.listen : colors.muted} />
          </Pressable>
        </View>

        <Pressable
          disabled={disabled}
          onPressIn={() => !recording && onVoiceStart()}
          onPressOut={() => recording && onVoiceStop()}
          style={({ pressed }) => [styles.actionBtn, recording && styles.actionBtnRec, pressed && styles.actionBtnPressed]}
        >
          {recording ? (
            <ActivityIndicator size="small" color={colors.navy} />
          ) : (
            <Ionicons name="mic" size={20} color={colors.navy} />
          )}
        </Pressable>

        <BouncePress
          sound={false}
          onPress={onSend}
          style={[styles.sendBtn, canSend && styles.sendBtnReady]}
          disabled={sending || !canSend}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.navy} />
          ) : (
            <Ionicons name="arrow-up" size={20} color={canSend ? colors.navy : colors.muted} />
          )}
        </BouncePress>
      </View>

      <AttachmentPicker visible={attachOpen} onClose={() => setAttachOpen(false)} disabled={disabled} onPick={onAttachment} />
      <CheerPicker visible={cheerOpen} onClose={() => setCheerOpen(false)} disabled={disabled} onPick={onCheer} />
    </View>
  );
}

export function chatPayloadFromVoice(voiceText: string, voiceSec: number, voiceUrl?: string): ChatSendPayload {
  return {
    kind: "voice",
    voiceText,
    voiceSec,
    voiceUrl,
    text: voiceText || "Voice note",
  };
}

const styles = StyleSheet.create({
  wrap: {},
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  fieldShell: {
    flex: 1,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingHorizontal: 6,
    ...shadow.card,
  },
  inlineBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  inlineBtnOn: { backgroundColor: "rgba(26,43,95,0.06)" },
  recRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.nameRed },
  recTxt: { flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.navy },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 96,
    paddingVertical: Platform.OS === "ios" ? 10 : 8,
    paddingHorizontal: 4,
    fontFamily: fonts.medium,
    color: colors.navy,
    fontSize: 15,
    lineHeight: 20,
    outlineStyle: "none",
    outlineWidth: 0,
    outlineColor: "transparent",
    ...(Platform.OS === "web"
      ? ({
          outline: "none",
          boxShadow: "none",
          borderWidth: 0,
          borderColor: "transparent",
        } as object)
      : null),
  },
  actionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    ...shadow.card,
  },
  actionBtnPressed: { opacity: 0.88 },
  actionBtnRec: { backgroundColor: "#FFF0F0" },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    ...shadow.card,
  },
  sendBtnReady: {
    backgroundColor: colors.yellow,
    shadowColor: colors.navy,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cheerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(26,43,95,0.2)",
    justifyContent: "flex-end",
    paddingBottom: 88,
    paddingHorizontal: 12,
  },
  webModalBackdrop: {
    alignItems: "center",
    paddingHorizontal: 0,
  },
  cheerSheet: {
    backgroundColor: colors.white,
    borderRadius: radii.card + 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    ...shadow.raised,
  },
  cheerSheetTitle: {
    fontFamily: fonts.extra,
    fontSize: 13,
    color: colors.navy,
    marginBottom: 10,
  },
  cheerRow: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  cheerPick: { alignItems: "center", width: 56, gap: 4 },
  cheerPickEmoji: { fontSize: 32, lineHeight: 36 },
  cheerPickLabel: { fontFamily: fonts.medium, fontSize: 9, color: colors.muted, textAlign: "center" },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(26,43,95,0.28)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: Platform.OS === "ios" ? 28 : 18,
    maxHeight: "62%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDD5C8",
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: fonts.extra,
    fontSize: 15,
    color: colors.navy,
    marginBottom: 8,
  },
  attachList: { gap: 4, paddingBottom: 4 },
  attachRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E8E2D6",
  },
  attachIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F6F1E8",
    alignItems: "center",
    justifyContent: "center",
  },
  attachLabel: { fontFamily: fonts.extra, fontSize: 14, color: colors.navy },
  attachSub: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted, marginTop: 2 },
});
