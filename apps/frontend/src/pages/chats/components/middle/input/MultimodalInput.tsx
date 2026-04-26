'use client';

import { useState, useRef } from 'react';
import type { ChangeEvent, ClipboardEvent, DragEvent } from 'react';
// import { useChat } from 'ai/react';
import { Send, X, Paperclip } from 'lucide-react';
import { Button, Textarea } from '@c_chat/ui';

// 定义附件类型
interface Attachment {
  file: File;
  preview: string; // Base64 预览图
}

export function MultimodalInput() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [inputValue, setInputValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 使用 Vercel AI SDK 的 useChat 处理发送逻辑
  // const { append, isLoading } = useChat({
  //   api: '/api/chat',
  //   // 关键配置：告诉后端我们发送的是多模态数据
  //   body: {
  //     // 这里可以根据需要添加额外参数
  //   },
  // });

  // 1. 处理文件选择（点击上传按钮）
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  // 2. 处理文件处理（统一逻辑：转 Base64 预览）
  const processFiles = (files: File[]) => {
    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return; // 简单示例：只处理图片

      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments((prev) => [
          ...prev,
          {
            file,
            preview: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  // 3. 处理粘贴（核心功能：Ctrl+V）
  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault(); // 阻止粘贴图片字符（乱码）
        const file = items[i].getAsFile();
        if (file) processFiles([file]);
      }
    }
  };

  // 4. 处理拖拽
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  // 5. 删除图片
  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // 6. 发送消息
  const handleSubmit = () => {
    // if ((!inputValue.trim() && attachments.length === 0) || isLoading) return;

    // 构造符合多模态模型的消息格式
    // 这里演示的是 OpenAI 格式，如果是硅基流动/Qwen 也是一样的
    const messageContent: any[] = [];

    // 添加文字
    if (inputValue.trim()) {
      messageContent.push({ type: 'text', text: inputValue });
    }

    // 添加图片
    attachments.forEach((att) => {
      messageContent.push({
        type: 'image_url',
        image_url: { url: att.preview }, // 发送 Base64
      });
    });

    // 发送并清空
    // append({ role: 'user', content: messageContent });
    setInputValue('');
    setAttachments([]);
  };

  return (
    <div
      className="w-full max-w-3xl mx-auto border rounded-xl bg-background shadow-lg overflow-hidden"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      {/* 图片预览区域 */}
      {attachments.length > 0 && (
        <div className="p-3 flex gap-3 overflow-x-auto border-b bg-muted/50">
          {attachments.map((att, idx) => (
            <div key={idx} className="relative group w-20 h-20 shrink-0">
              <img
                src={att.preview}
                alt="preview"
                className="w-full h-full object-cover rounded-lg border"
              />
              <button
                onClick={() => removeAttachment(idx)}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 输入区域 */}
      <div className="relative p-4">
        <Textarea
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          onPaste={handlePaste}
          placeholder="输入消息，或粘贴/拖拽图片..."
          className="min-h-[80px] resize-none border-0 focus-visible:ring-0 p-0 text-base bg-transparent"
        />

        {/* 底部工具栏 */}
        <div className="flex justify-between items-center mt-4">
          <div className="flex gap-2">
            {/* 隐藏的文件输入框 */}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
            />
            {/* 触发按钮 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              title="上传图片"
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={handleSubmit}
            // disabled={isLoading || (!inputValue.trim() && attachments.length === 0)}
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            发送
          </Button>
        </div>
      </div>
    </div>
  );
}
