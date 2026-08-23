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

function pickDocumentWeb(): Promise<PickedChatFile | null> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(null);
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,image/*,video/*";
    input.style.display = "none";
    document.body.appendChild(input);
    input.onchange = () => {
      const file = input.files?.[0];
      input.remove();
      if (!file) {
        resolve(null);
        return;
      }
      resolve({
        uri: URL.createObjectURL(file),
        name: file.name || "document",
        mime: file.type || "application/octet-stream",
        kind: mimeToKind(file.type || ""),
      });
    };
    input.click();
  });
}

export async function pickChatDocument(): Promise<PickedChatFile | null> {
  return pickDocumentWeb();
}

export async function pickChatAttachment(source: AttachmentSource): Promise<PickedChatFile | null> {
  if (source === "photo") return pickChatPhoto();
  if (source === "video") return pickChatVideo();
  return pickChatDocument();
}
