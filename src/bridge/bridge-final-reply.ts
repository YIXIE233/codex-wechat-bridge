import {
  formatFinalReplyMessage,
  parseWechatFinalReply,
  sanitizeWechatFinalReplyText,
  splitWechatTextIntoChunks,
} from "./bridge-utils.ts";

export type WechatFinalReplySender = {
  sendText: (text: string) => Promise<boolean | void>;
  sendImage: (imagePath: string) => Promise<unknown>;
  sendFile: (filePath: string) => Promise<unknown>;
  sendVoice: (voicePath: string) => Promise<unknown>;
  sendVideo: (videoPath: string) => Promise<unknown>;
};

export async function forwardWechatFinalReply(params: {
  rawText: string;
  sender: WechatFinalReplySender;
  onEmptyVisibleReply?: (details: {
    rawVisibleText: string;
  }) => void;
}): Promise<void> {
  const { rawText, sender, onEmptyVisibleReply } = params;
  const parsed = parseWechatFinalReply(rawText);
  const sanitizedText = sanitizeWechatFinalReplyText(parsed.visibleText);
  const visibleText = formatFinalReplyMessage(sanitizedText).trim();

  if (visibleText) {
    // Send long replies in bounded chunks: a single oversized sendmessage call
    // can be rejected by the WeChat API, silently losing the whole reply.
    for (const chunk of splitWechatTextIntoChunks(visibleText)) {
      const sent = await sender.sendText(chunk);
      if (sent === false) {
        return;
      }
    }
  } else if (parsed.visibleText.trim()) {
    onEmptyVisibleReply?.({ rawVisibleText: parsed.visibleText });
  }

  for (const attachment of parsed.attachments) {
    try {
      switch (attachment.kind) {
        case "image":
          await sender.sendImage(attachment.path);
          break;
        case "file":
          await sender.sendFile(attachment.path);
          break;
        case "voice":
          await sender.sendVoice(attachment.path);
          break;
        case "video":
          await sender.sendVideo(attachment.path);
          break;
      }
    } catch (error) {
      const errorText =
        error instanceof Error ? error.message : String(error ?? "unknown error");
      await sender.sendText(
        `Failed to send ${attachment.kind} attachment: ${attachment.path}\n${errorText}`,
      );
    }
  }
}

