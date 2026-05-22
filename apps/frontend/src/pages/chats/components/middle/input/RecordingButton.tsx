import { memo } from 'react';
import { formatDuration, type VoiceRecordResult } from '@c_chat/audio-core';
import { useAudioRecorder } from '@c_chat/frontend/hooks/useAudioRecorder';
import { Button } from '@c_chat/ui';
import { Mic, StopCircle, X } from 'lucide-react';
import { generateLastMsgContent, ipc, to } from '@c_chat/shared-utils';
import { useChatStore, useMessageStore } from '@c_chat/frontend/stores';
import { toast } from 'sonner';
const RecordingButton = () => {
  const { selectedConversation, selectedUserForDraft, updateConversationSnapshot } = useChatStore();
  const { addMsgList } = useMessageStore();

  const { isRecording, recording, duration } = useAudioRecorder();

  const stopRecording = async () => {
    const res = await recording.stop();
    console.log('stopRecording', res);
    if (!res) {
      toast.error('录音失败');
      return;
    }
    sendVoiceMessage(res);
  };

  const sendVoiceMessage = async (recordResult: VoiceRecordResult) => {
    const { blob, ...rest } = recordResult;
    const arrayBuffer = await blob.arrayBuffer();

    const file = await ipc.saveVoice({ buffer: arrayBuffer, metadata: rest });
    const isDraft = selectedUserForDraft && !selectedConversation;
    const sendMessageParams = {
      files: [file],
      content: '',
      ...(isDraft
        ? { targetId: selectedUserForDraft?.id }
        : { conversationId: selectedConversation?.id }),
    };

    const [err, messages] = await to(ipc.SendMessage(sendMessageParams));
    if (err) {
      console.error('Failed to send message:', err);
      toast.error('发送语音失败');
      return;
    }

    addMsgList(messages);
    if (selectedConversation && messages.length > 0) {
      const latestMessage = messages.reduce((latest, message) =>
        (message.createTime ?? 0) > (latest.createTime ?? 0) ? message : latest,
      );
      updateConversationSnapshot(
        selectedConversation.id,
        generateLastMsgContent(latestMessage.type, latestMessage.content),
        latestMessage.createTime ?? Date.now(),
      );
    }
    window.dispatchEvent(new Event('chat:scroll-to-bottom'));
  };

  return (
    <div className="flex items-center gap-2">
      {!isRecording ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={recording.start}
          title="开始录音"
        >
          <Mic className="w-4 h-4 text-current" />
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-2 px-2 py-1 rounded bg-red-50 text-red-600">
            <span className="w-2 h-2 rounded-full bg-red-600 inline-block" />
            <span className="text-sm">{formatDuration(duration)}</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={stopRecording}
            title="停止并发送"
          >
            <StopCircle className="w-5 h-5 text-current" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={recording.cancel} title="取消">
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
export default memo(RecordingButton);
