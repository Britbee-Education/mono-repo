import { Platform } from "react-native";
import { api, type ChatSendPayload } from "@/lib/api";
import type { AttachmentKind } from "@/lib/chatEngagement";

export type AttachmentSource = "photo" | "video" | "document";

export type PickedChatFile = {
  uri: string;
  name: string;
  mime: string;
  kind: AttachmentKind;
};

export type UploadedChatAttachment = {
  attachmentUrl: string;
  attachmentMime: string;
  attachmentName: string;
  attachmentKind: AttachmentKind;
};

export function guessName(uri: string, fallback: string) {
  const bit = uri.split("/").pop()?.split("?")[0];
  return bit && bit.includes(".") ? bit : fallback;
}

export function mimeToKind(mime: string): AttachmentKind {
  const lower = mime.toLowerCase();
  if (lower.startsWith("image/")) return "photo";
  if (lower.startsWith("video/")) return "video";
  return "document";
}

export async function buildUploadFormData(picked: PickedChatFile): Promise<FormData> {
  const form = new FormData();
  if (Platform.OS === "web") {
    const res = await fetch(picked.uri);
    const blob = await res.blob();
    form.append("file", blob, picked.name);
    return form;
  }
  form.append("file", {
    uri: picked.uri,
    name: picked.name,
    type: picked.mime,
  } as unknown as Blob);
  return form;
}

export function chatPayloadFromAttachment(upload: UploadedChatAttachment): ChatSendPayload {
  return {
    kind: "attachment",
    text:
      upload.attachmentKind === "photo"
        ? "Photo"
        : upload.attachmentKind === "video"
          ? "Video"
          : upload.attachmentName || "Document",
    attachmentKind: upload.attachmentKind,
    attachmentUrl: upload.attachmentUrl,
    attachmentName: upload.attachmentName,
    attachmentMime: upload.attachmentMime,
  };
}

export async function uploadChatAttachment(picked: PickedChatFile): Promise<UploadedChatAttachment> {
  const form = await buildUploadFormData(picked);
  return api.chatUpload(form);
}
