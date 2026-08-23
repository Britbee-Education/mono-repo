import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
  Pressable,
  Alert,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BouncePress } from "@/components/game/BouncePress";
import { HiveAvatar, ago } from "@/components/hive/HiveAvatar";
import { SocialChatComposer, chatPayloadFromVoice } from "@/components/social/ChatEngagementBar";
import { RichChatBubble } from "@/components/social/RichChatBubble";
import { VibeOverlay } from "@/components/social/VibeOverlay";
import { useAuth } from "@/context/AuthContext";
import { useHive } from "@/context/HiveContext";
import { useProgress } from "@/context/ProgressContext";
import { useSocial, isPendingChatId } from "@/context/SocialContext";
import { useLayout } from "@/lib/layout";
import { useKeyboardHeight } from "@/lib/useKeyboardHeight";
import { QUESTS } from "@/lib/quests";
import { playSfx } from "@/lib/sfx";
import { listenBlockMessage } from "@/lib/speech";
import { canRecordVoice, startVoiceCapture } from "@/lib/chatVoice";
import {
  chatPayloadFromAttachment,
  pickChatAttachment,
  uploadChatAttachment,
  type AttachmentSource,
} from "@/lib/chatAttachments";
import { cheerPayload, type ChatCheer } from "@/lib/chatEngagement";
import { colors, fonts } from "@/constants/theme";
import type { SocialChat, MentorChatMessage, MentorPublishedRoom, SocialRoom } from "@/lib/api";

type MainTab = "chat" | "play";
type ChatChannel = "mentor" | "everyone" | "room";

const CHAT_CHANNELS: { id: ChatChannel; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: "mentor", label: "Mentor", icon: "person-outline" },
  { id: "everyone", label: "Everyone", icon: "people-outline" },
  { id: "room", label: "Room", icon: "extension-puzzle-outline" },
];

function shortWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  if (sameDay) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function roomExpiryLabel(room: MentorPublishedRoom) {
  if (room.status === "ended") return room.endedAt ? `Ended · ${shortWhen(room.endedAt)}` : "Ended";
  if (room.status === "expired") return `Expired · ${shortWhen(room.expiresAt)}`;
  const ms = Date.parse(room.expiresAt) - Date.now();
  if (ms <= 0) return "Ending soon";
  const mins = Math.ceil(ms / 60_000);
  if (mins < 60) return `Ends in ${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `Ends in ${hrs}h ${mins % 60}m`;
}

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={[styles.segmentBtn, active && styles.segmentBtnOn]}
          >
            <Text style={[styles.segmentTxt, active && styles.segmentTxtOn]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChannelSwitch({
  options,
  value,
  onChange,
}: {
  options: typeof CHAT_CHANNELS;
  value: ChatChannel;
  onChange: (id: ChatChannel) => void;
}) {
  return (
    <View style={styles.channelRow}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <Pressable key={opt.id} onPress={() => onChange(opt.id)} style={[styles.channelItem, active && styles.channelItemOn]}>
            <Ionicons name={opt.icon} size={15} color={active ? colors.navy : colors.muted} />
            <Text style={[styles.channelLabel, active && styles.channelLabelOn]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ChatBubble({
  mine,
  pending,
  name,
  text,
  mentor,
  hue,
  look,
  msg,
}: {
  mine: boolean;
  pending: boolean;
  name?: string;
  text: string;
  mentor?: boolean;
  hue?: number;
  look?: string;
  msg?: SocialChat | MentorChatMessage;
}) {
  const rich = msg || { id: "tmp", text, kind: "text" as const };
  return (
    <RichChatBubble
      mine={mine}
      pending={pending}
      name={name}
      mentor={mentor}
      hue={hue}
      look={look}
      msg={rich}
    />
  );
}

export default function SocialScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { padX } = useLayout();
  const insets = useSafeAreaInsets();
  const { grantHelloPack } = useProgress();
  const { hive, refresh: refreshHive, dare } = useHive();
  const { social, mentorChat, refresh, sendChat, sendChatPayload, sendMentorChat, sendMentorChatPayload, sendVibe, startRoom, joinRoom, loadRoom, setChatLive } = useSocial();
  const [draft, setDraft] = useState("");
  const [tab, setTab] = useState<MainTab>("chat");
  const [channel, setChannel] = useState<ChatChannel>("mentor");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingHint, setRecordingHint] = useState("");
  const [vibeBurstTick, setVibeBurstTick] = useState(0);
  const [vibeBurst, setVibeBurst] = useState<{ vibe: string; name: string } | null>(null);
  const chatScrollRef = useRef<ScrollView>(null);
  const voiceSessionRef = useRef<ReturnType<typeof startVoiceCapture> | null>(null);
  const meName = user?.child?.childName?.split(" ")[0] || "Bee";
  const meId = hive?.me.id || user?.id || "";
  const mentorRooms = social?.mentorRooms || [];
  const liveMentorRooms = useMemo(() => mentorRooms.filter((r) => r.canEnter), [mentorRooms]);
  const pastMentorRooms = useMemo(() => mentorRooms.filter((r) => !r.canEnter), [mentorRooms]);
  const isMessaging = channel === "mentor" || channel === "everyone";
  const chatLiveOn = tab === "chat" && isMessaging;

  useFocusEffect(
    useCallback(() => {
      grantHelloPack();
      void refresh();
      void refreshHive();
      setChatLive(chatLiveOn);
      return () => setChatLive(false);
    }, [grantHelloPack, refresh, refreshHive, setChatLive, chatLiveOn])
  );

  useEffect(() => {
    setChatLive(chatLiveOn);
  }, [chatLiveOn, setChatLive]);

  const activeMessages = channel === "mentor" ? mentorChat || [] : social?.chat || [];

  useEffect(() => {
    if (tab !== "chat" || !isMessaging) return;
    chatScrollRef.current?.scrollToEnd({ animated: true });
  }, [activeMessages.length, channel, tab, isMessaging]);

  const keyboardHeight = useKeyboardHeight(tab === "chat" && isMessaging);

  const scrollChatToEnd = useCallback(() => {
    requestAnimationFrame(() => chatScrollRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    if (tab !== "chat" || !isMessaging || keyboardHeight <= 0) return;
    scrollChatToEnd();
  }, [keyboardHeight, tab, isMessaging, scrollChatToEnd]);

  useEffect(() => {
    if (tab !== "chat" || !isMessaging || Platform.OS !== "ios") return;
    const sub = Keyboard.addListener("keyboardWillShow", scrollChatToEnd);
    return () => sub.remove();
  }, [tab, isMessaging, scrollChatToEnd]);

  const liveRooms = useMemo(
    () => (social?.rooms || []).filter((r) => r.kind !== "circle" && r.status !== "done"),
    [social]
  );

  async function enterMentorRoom(room: MentorPublishedRoom) {
    if (!room.canEnter) return;
    playSfx("buzz");
    const existing = await loadRoom(room.playRoomId);
    if (existing) {
      router.push(`/social/${existing.id}`);
      return;
    }
    const joined = await joinRoom(room.playRoomId);
    if (joined) router.push(`/social/${joined.id}`);
  }

  async function openRoom(room: SocialRoom) {
    playSfx("buzz");
    const joined = room.players.some((p) => p.id === meId) ? room : await joinRoom(room.id);
    if (!joined) return;
    router.push(`/social/${joined.id}`);
  }

  async function begin(kind: "battle" | "race", learnerId?: string) {
    playSfx("buzz");
    const room = await startRoom(kind, learnerId);
    if (!room) return;
    router.push(`/social/${room.id}`);
  }

  async function sendPayload(payload: Parameters<typeof sendChatPayload>[0]) {
    if (sending || recording) return false;
    setSending(true);
    const ok = channel === "mentor" ? await sendMentorChatPayload(payload) : await sendChatPayload(payload);
    if (ok) playSfx("ok");
    else playSfx("miss");
    setSending(false);
    return ok;
  }

  async function onCheer(cheer: ChatCheer) {
    playSfx(cheer.id === "celebrate" || cheer.id === "popper" ? "fanfare" : cheer.id === "clap" ? "coin" : cheer.id === "bee" ? "buzz" : "star");
    setVibeBurst({ vibe: cheer.id, name: meName });
    setVibeBurstTick((n) => n + 1);
    await sendVibe(cheerPayload(cheer));
  }

  function onVoiceStart() {
    if (sending || recording) return;
    if (!canRecordVoice()) {
      Alert.alert("Voice note", listenBlockMessage() || "Microphone is not available on this device.");
      return;
    }
    playSfx("record");
    setRecording(true);
    setRecordingHint("");
    voiceSessionRef.current = startVoiceCapture((text) => setRecordingHint(text));
  }

  async function onAttachment(source: AttachmentSource) {
    if (sending || recording) return;
    setSending(true);
    try {
      const picked = await pickChatAttachment(source);
      if (!picked) {
        setSending(false);
        return;
      }
      const uploaded = await uploadChatAttachment(picked);
      const ok = await sendPayload(chatPayloadFromAttachment(uploaded));
      if (ok) playSfx("ok");
      else playSfx("miss");
    } catch (e: unknown) {
      playSfx("miss");
      Alert.alert("Attachment", e instanceof Error ? e.message : "Could not send file.");
    } finally {
      setSending(false);
    }
  }

  async function onVoiceStop() {
    const session = voiceSessionRef.current;
    voiceSessionRef.current = null;
    if (!session) {
      setRecording(false);
      return;
    }
    session.stop();
    setRecording(false);
    setSending(true);
    try {
      const result = await session.done;
      if (!result.voiceUrl) {
        playSfx("miss");
        Alert.alert("Voice note", "Could not upload voice note.");
        return;
      }
      const payload = chatPayloadFromVoice(result.text, result.sec, result.voiceUrl);
      const ok = channel === "mentor" ? await sendMentorChatPayload(payload) : await sendChatPayload(payload);
      if (ok) playSfx("ok");
      else playSfx("miss");
    } catch (e: unknown) {
      playSfx("miss");
      Alert.alert("Voice note", e instanceof Error ? e.message : "Could not send voice note.");
    } finally {
      setSending(false);
    }
  }

  async function onSend() {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft("");
    const ok = channel === "mentor" ? await sendMentorChat(text) : await sendChat(text);
    if (ok) {
      playSfx("ok");
    } else {
      setDraft(text);
      playSfx("miss");
    }
    setSending(false);
  }

  const onDraftChange = useCallback(
    (text: string) => {
      setDraft(text);
      if (keyboardHeight > 0) scrollChatToEnd();
    },
    [keyboardHeight, scrollChatToEnd]
  );

  async function sendDareTo(id: string) {
    const next = QUESTS.find((q) => q.id === (hive?.mentor?.activityId || "sentence")) || QUESTS[1];
    const ok = await dare(id, next.id);
    if (ok) playSfx("star");
  }

  function renderMentorMsg(msg: MentorChatMessage) {
    const mine = msg.from === "learner";
    return (
      <ChatBubble
        key={msg.id}
        mine={mine}
        pending={isPendingChatId(msg.id)}
        name={mine ? undefined : msg.mentorName || "Mentor"}
        text={msg.text}
        mentor={!mine}
        msg={msg}
      />
    );
  }

  function renderCommonMsg(msg: SocialChat) {
    const isMentor = msg.from === "mentor" || msg.learnerId.startsWith("guide:");
    const mine = !isMentor && (msg.name === meName || msg.learnerId === meId);
    return (
      <ChatBubble
        key={msg.id}
        mine={mine}
        pending={isPendingChatId(msg.id)}
        name={mine ? undefined : isMentor ? msg.mentorName || msg.name || "Mentor" : msg.name}
        text={msg.text}
        mentor={isMentor}
        hue={msg.hue}
        look={msg.look}
        msg={msg}
      />
    );
  }

  const composerPlaceholder = channel === "mentor" ? "Ask your mentor…" : "Message everyone…";
  const canSend = draft.trim().length > 0 && !sending && !recording;
  const chatSwitchOptions = CHAT_CHANNELS;
  const keyboardOpen = keyboardHeight > 0;
  const dockPadBottom = keyboardOpen ? 8 : Math.max(insets.bottom, 8);

  return (
    <View style={styles.root}>
      {tab === "chat" && isMessaging ? (
        <VibeOverlay
          vibes={social?.vibes || []}
          localBurst={vibeBurst ? { ...vibeBurst, tick: vibeBurstTick } : null}
        />
      ) : null}
      <View style={styles.flex}>
        <View style={[styles.mainTabBar, { paddingHorizontal: padX }]}>
          <SegmentedControl
            options={[
              { id: "chat" as const, label: "Chat" },
              { id: "play" as const, label: "Play" },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>

        {tab === "chat" ? (
          <>
            <View style={{ paddingHorizontal: padX }}>
              <ChannelSwitch options={chatSwitchOptions} value={channel} onChange={setChannel} />
            </View>

            {channel === "room" ? (
              <ScrollView
                style={styles.flex}
                contentContainerStyle={[styles.roomList, { paddingHorizontal: padX }]}
                showsVerticalScrollIndicator={false}
              >
                {liveMentorRooms.length ? <Text style={styles.roomSection}>Live now</Text> : null}
                {liveMentorRooms.map((room) => (
                  <BouncePress key={room.id} sound="tap" onPress={() => void enterMentorRoom(room)} style={styles.roomCard}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.roomActivity}>{room.activityName}</Text>
                      <Text style={styles.roomTitle} numberOfLines={1}>
                        {room.title}
                      </Text>
                      <Text style={styles.roomSub} numberOfLines={2}>
                        {room.prompt}
                      </Text>
                      <Text style={styles.roomMeta}>{roomExpiryLabel(room)} · {room.mentorName}</Text>
                    </View>
                    <Text style={styles.roomGo}>Enter</Text>
                  </BouncePress>
                ))}

                {!liveMentorRooms.length ? (
                  <Text style={styles.roomEmpty}>No live rooms right now. Your mentor will post one here.</Text>
                ) : null}

                {social?.circle ? (
                  <BouncePress sound="tap" onPress={() => void openRoom(social.circle)} style={styles.roomCard}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.roomActivity}>Daily circle</Text>
                      <Text style={styles.roomTitle} numberOfLines={1}>
                        Hive circle talk
                      </Text>
                      <Text style={styles.roomSub} numberOfLines={2}>
                        {social.prompt}
                      </Text>
                      <Text style={styles.roomMeta}>Always open today</Text>
                    </View>
                    <Text style={styles.roomGo}>Enter</Text>
                  </BouncePress>
                ) : null}

                {pastMentorRooms.length ? <Text style={styles.roomSection}>Past rooms</Text> : null}
                {pastMentorRooms.map((room) => (
                  <View key={room.id} style={[styles.roomCard, styles.roomCardPast]}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.roomActivity}>{room.activityName}</Text>
                      <Text style={styles.roomTitle} numberOfLines={1}>
                        {room.title}
                      </Text>
                      <Text style={styles.roomSub} numberOfLines={2}>
                        {room.prompt}
                      </Text>
                      <Text style={styles.roomMeta}>{roomExpiryLabel(room)} · {room.mentorName}</Text>
                    </View>
                    <Text style={styles.roomPastTag}>{room.status === "ended" ? "Ended" : "Expired"}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <View style={[styles.chatPane, { paddingBottom: keyboardHeight }]}>
                <ScrollView
                  ref={chatScrollRef}
                  style={styles.flex}
                  contentContainerStyle={[styles.chatBody, { paddingHorizontal: padX, paddingBottom: 12 }]}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode="interactive"
                  onContentSizeChange={scrollChatToEnd}
                >
                  {channel === "mentor" ? (
                    mentorChat?.length ? (
                      mentorChat.map(renderMentorMsg)
                    ) : (
                      <Text style={styles.emptyChat}>Say hi to your mentor</Text>
                    )
                  ) : social?.chat?.length ? (
                    social.chat.map(renderCommonMsg)
                  ) : (
                    <Text style={styles.emptyChat}>Say hello to the hive</Text>
                  )}
                </ScrollView>

                <View style={[styles.chatDock, { paddingHorizontal: padX, paddingBottom: dockPadBottom }]}>
                  <SocialChatComposer
                    draft={draft}
                    onChangeDraft={onDraftChange}
                    placeholder={composerPlaceholder}
                    canSend={canSend}
                    sending={sending}
                    recording={recording}
                    recordingHint={recordingHint}
                    disabled={sending}
                    maxLength={channel === "mentor" ? 220 : 120}
                    onSend={() => void onSend()}
                    onCheer={(cheer) => void onCheer(cheer)}
                    onAttachment={(source) => void onAttachment(source)}
                    onInputFocus={scrollChatToEnd}
                    onVoiceStart={onVoiceStart}
                    onVoiceStop={() => void onVoiceStop()}
                  />
                </View>
              </View>
            )}
          </>
        ) : (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.playBody, { paddingHorizontal: padX }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {(social?.online || []).length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.onlineRow}>
                {(social?.online || []).map((bee) => (
                  <View key={bee.id} style={styles.onlineItem}>
                    <HiveAvatar name={bee.name} hue={bee.hue} look={bee.look} size={40} online ring={bee.me} />
                    <Text style={styles.onlineName} numberOfLines={1}>
                      {bee.me ? "You" : bee.name}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            <View style={styles.playRow}>
              <BouncePress sound="tap" onPress={() => void openRoom(social!.circle)} disabled={!social?.circle} style={styles.playBtn}>
                <Text style={styles.playEmoji}>🏟️</Text>
                <Text style={styles.playLabel}>Tournament</Text>
              </BouncePress>
              <BouncePress sound="tap" onPress={() => void begin("battle")} style={styles.playBtn}>
                <Text style={styles.playEmoji}>⚔️</Text>
                <Text style={styles.playLabel}>Battle</Text>
              </BouncePress>
              <BouncePress sound="tap" onPress={() => void begin("race")} style={styles.playBtn}>
                <Text style={styles.playEmoji}>🏁</Text>
                <Text style={styles.playLabel}>Race</Text>
              </BouncePress>
            </View>

            {hive?.dare ? (
              <BouncePress
                sound="tap"
                onPress={() => router.push((hive.dare!.href || "/(main)") as never)}
                style={styles.listRow}
              >
                <Text style={styles.listEmoji}>🎯</Text>
                <Text style={styles.listTitle} numberOfLines={1}>
                  {hive.dare.fromMe ? `Dared ${hive.dare.otherName}` : `${hive.dare.otherName} dared you`}
                  {!hive.dare.iDone ? " · go" : ""}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </BouncePress>
            ) : null}

            {liveRooms.map((room) => (
              <BouncePress key={room.id} sound={false} onPress={() => void openRoom(room)} style={styles.listRow}>
                <Text style={styles.listEmoji}>{room.kind === "battle" ? "⚔️" : "🏁"}</Text>
                <Text style={styles.listTitle} numberOfLines={1}>
                  {room.title} · {room.players.length} playing
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.muted} />
              </BouncePress>
            ))}

            {hive?.dareTargets?.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.challengeRow}>
                {hive.dareTargets.slice(0, 10).map((bee) => (
                  <View key={bee.id} style={styles.challengeChip}>
                    <HiveAvatar name={bee.name} hue={bee.hue} look={bee.look} size={36} />
                    <Text style={styles.challengeName} numberOfLines={1}>
                      {bee.name}
                    </Text>
                    <View style={styles.challengeActions}>
                      <Pressable onPress={() => void begin("battle", bee.id)} hitSlop={6} style={styles.challengeTap}>
                        <Text style={styles.challengeTapTxt}>⚔️</Text>
                      </Pressable>
                      {hive.canDare ? (
                        <Pressable onPress={() => void sendDareTo(bee.id)} hitSlop={6} style={styles.challengeTap}>
                          <Text style={styles.challengeTapTxt}>🎯</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : null}

            {hive?.feed?.length
              ? hive.feed.slice(0, 3).map((item) => (
                  <View key={item.id} style={styles.feedRow}>
                    <HiveAvatar name={item.name} size={24} />
                    <Text style={styles.feedTxt} numberOfLines={1}>
                      <Text style={styles.feedName}>{item.name} </Text>
                      {item.text}
                    </Text>
                    <Text style={styles.feedAgo}>{ago(item.createdAt)}</Text>
                  </View>
                ))
              : null}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const hairline = StyleSheet.hairlineWidth;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F6F1E8", overflow: "visible" },
  flex: { flex: 1 },
  mainTabBar: {
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: hairline,
    borderBottomColor: "#DDD5C8",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: "#E8E2D6",
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  segmentBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 9,
  },
  segmentBtnOn: {
    backgroundColor: colors.white,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  segmentTxt: {
    fontFamily: fonts.bold,
    fontSize: 14,
    color: colors.muted,
  },
  segmentTxtOn: {
    color: colors.navy,
    fontFamily: fonts.extra,
  },
  channelRow: {
    flexDirection: "row",
    borderBottomWidth: hairline,
    borderBottomColor: "#E8E2D6",
  },
  channelItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    marginBottom: -hairline,
  },
  channelItemOn: {
    borderBottomColor: colors.yellow,
  },
  channelLabel: {
    fontFamily: fonts.bold,
    fontSize: 13,
    color: colors.muted,
  },
  channelLabelOn: {
    color: colors.navy,
    fontFamily: fonts.extra,
  },
  chatPane: { flex: 1 },
  chatBody: { paddingTop: 8, gap: 6, flexGrow: 1 },
  emptyChat: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 32,
  },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 5, maxWidth: "94%" },
  bubbleMine: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  bubble: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: "88%",
  },
  bubbleMe: { backgroundColor: colors.navy },
  bubbleMentor: { backgroundColor: "#E3F2E8" },
  bubblePending: { opacity: 0.7 },
  bubbleName: { fontFamily: fonts.bold, color: colors.listen, fontSize: 9, marginBottom: 1 },
  bubbleNameMentor: { color: "#2E7D32" },
  bubbleTxt: { fontFamily: fonts.medium, color: colors.navy, fontSize: 14, lineHeight: 19 },
  bubbleTxtMe: { color: colors.white },
  pendingTxt: { fontFamily: fonts.bold, color: colors.muted, fontSize: 9, marginTop: 2, textAlign: "right" },
  chatDock: {
    paddingTop: 10,
    backgroundColor: "#F6F1E8",
  },
  roomList: { paddingTop: 10, paddingBottom: 24, gap: 8 },
  roomSection: {
    marginTop: 4,
    marginBottom: 2,
    fontFamily: fonts.bold,
    fontSize: 11,
    color: colors.muted,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  roomCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: hairline,
    borderBottomColor: "#E8E2D6",
  },
  roomCardPast: { opacity: 0.72 },
  roomActivity: { fontFamily: fonts.bold, fontSize: 10, color: colors.listen, textTransform: "uppercase", letterSpacing: 0.3 },
  roomTitle: { fontFamily: fonts.extra, fontSize: 15, color: colors.navy, marginTop: 2 },
  roomSub: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted, marginTop: 3, lineHeight: 16 },
  roomMeta: { fontFamily: fonts.bold, fontSize: 10, color: colors.muted, marginTop: 5 },
  roomGo: { fontFamily: fonts.extra, fontSize: 13, color: colors.listen },
  roomPastTag: { fontFamily: fonts.bold, fontSize: 11, color: colors.muted },
  roomEmpty: {
    fontFamily: fonts.medium,
    color: colors.muted,
    fontSize: 13,
    textAlign: "center",
    paddingVertical: 20,
  },
  playBody: { paddingTop: 8, paddingBottom: 20, gap: 4 },
  onlineRow: { flexDirection: "row", gap: 10, paddingBottom: 8 },
  onlineItem: { width: 50, alignItems: "center", gap: 3 },
  onlineName: { fontFamily: fonts.bold, color: colors.navy, fontSize: 10, maxWidth: 50, textAlign: "center" },
  playRow: { flexDirection: "row", justifyContent: "space-around", paddingVertical: 10 },
  playBtn: { alignItems: "center", gap: 4, minWidth: 72 },
  playEmoji: { fontSize: 28 },
  playLabel: { fontFamily: fonts.bold, color: colors.navy, fontSize: 11 },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderTopWidth: hairline,
    borderTopColor: "#DDD5C8",
  },
  listEmoji: { fontSize: 18, width: 24, textAlign: "center" },
  listTitle: { flex: 1, fontFamily: fonts.medium, color: colors.navy, fontSize: 14 },
  challengeRow: { flexDirection: "row", gap: 8, paddingVertical: 8 },
  challengeChip: { width: 64, alignItems: "center", gap: 2 },
  challengeName: { fontFamily: fonts.bold, color: colors.navy, fontSize: 9, maxWidth: 64, textAlign: "center" },
  challengeActions: { flexDirection: "row", gap: 6 },
  challengeTap: { padding: 2 },
  challengeTapTxt: { fontSize: 16 },
  feedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    borderTopWidth: hairline,
    borderTopColor: "#DDD5C8",
  },
  feedTxt: { flex: 1, fontFamily: fonts.medium, color: colors.ink, fontSize: 12 },
  feedName: { fontFamily: fonts.extra, color: colors.navy },
  feedAgo: { fontFamily: fonts.bold, color: colors.muted, fontSize: 10 },
});
