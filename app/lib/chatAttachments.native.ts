import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import type { AttachmentKind } from "@/lib/chatEngagement";
import {
  guessName,
  mimeToKind,
  type AttachmentSource,
  type PickedChatFile,
  type UploadedChatAttachment,
  chatPayloadFromAttachment,
  uploadChatAttachment,
} from "./chatAttachments.shared";

export type { AttachmentSource, PickedChatFile, UploadedChatAttachment };
export { chatPayloadFromAttachment, uploadChatAttachment };

async function ensureLibraryAccess() {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return status === "granted";
}

function fromImageAsset(asset: ImagePicker.ImagePickerAsset, kind: AttachmentKind): PickedChatFile {
  return {
    uri: asset.uri,
    name: asset.fileName || guessName(asset.uri, kind === "photo" ? "photo.jpg" : "video.mp4"),
    mime: asset.mimeType || (kind === "photo" ? "image/jpeg" : "video/mp4"),
    kind,
  };
}

export async function pickChatPhoto(): Promise<PickedChatFile | null> {
  if (!(await ensureLibraryAccess())) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.85,
    allowsEditing: false,
  });
  if (result.canceled || !result.assets[0]) return null;
  return fromImageAsset(result.assets[0], "photo");
}

export async function pickChatVideo(): Promise<PickedChatFile | null> {
  if (!(await ensureLibraryAccess())) return null;
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["videos"],
    quality: 1,
    allowsEditing: false,
    videoMaxDuration: 120,
  });
  if (result.canceled || !result.assets[0]) return null;
  return fromImageAsset(result.assets[0], "video");
}

export async function pickChatDocument(): Promise<PickedChatFile | null> {
  const result = await DocumentPicker.getDocumentAsync({
    copyToCacheDirectory: true,
    multiple: false,
    type: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "image/*",
      "video/*",
    ],
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const mime = (asset.mimeType || "application/octet-stream").toLowerCase();
  return {
    uri: asset.uri,
    name: asset.name || guessName(asset.uri, "document"),
    mime,
    kind: mimeToKind(mime),
  };
}

export async function pickChatAttachment(source: AttachmentSource): Promise<PickedChatFile | null> {
  if (source === "photo") return pickChatPhoto();
  if (source === "video") return pickChatVideo();
  return pickChatDocument();
}
