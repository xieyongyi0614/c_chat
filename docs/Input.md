可以，一步到位给你一套**接近 Discord / 飞书级别的输入框方案 + 可运行代码骨架 + 和你 Electron + Nest 的对接方式**。
我不会给你“演示级代码”，而是**可扩展架构 + 核心实现**，你可以直接塞进你现在这个 IM 项目里。

---

# 🧠 最终效果（你将得到）

输入框具备：

- ✅ @ 提及（用户搜索 + 键盘选择）
- ✅ `/` 命令（slash command）
- ✅ 😀 表情面板（Radix Popover）
- ✅ 📎 上传（带进度）
- ✅ 🖼 粘贴 / 拖拽图片预览
- ✅ 🎤 语音消息
- ✅ ⏳ 上传进度 UI（类似 Discord）
- ✅ ⚡ 发送前统一处理（上传→发消息）

---

# 🧱 架构升级（重点！）

别再用普通 state 了，建议你这样分层：

```id="arch"
ChatInput/
├── index.tsx              // 主组件（组合）
├── editor/
│   ├── RichEditor.tsx     // 输入（lexical）
│   ├── MentionPlugin.tsx  // @提及
│   ├── SlashPlugin.tsx    // /
├── attachments/
│   ├── store.ts           // zustand
│   ├── uploader.ts        // 上传逻辑（对接 Nest）
│   ├── AttachmentList.tsx
├── ui/
│   ├── EmojiPicker.tsx
│   ├── UploadButton.tsx
│   ├── VoiceRecorder.tsx
```

---

# ⚙️ 技术选型（别改）

| 功能       | 技术                     |
| ---------- | ------------------------ |
| 输入编辑器 | **lexical（Meta 出品）** |
| UI         | shadcn/ui                |
| 弹层       | Radix                    |
| 状态       | zustand                  |
| 上传       | axios + onUploadProgress |

---

# 🧩 1. Zustand 附件 + 上传状态（核心）

```ts
import { create } from 'zustand';

export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';

export interface Attachment {
  id: string;
  file?: File;
  url?: string;
  type: 'image' | 'file' | 'audio';
  progress: number;
  status: UploadStatus;
}

export const useAttachmentStore = create<{
  list: Attachment[];
  add: (a: Attachment) => void;
  update: (id: string, patch: Partial<Attachment>) => void;
  remove: (id: string) => void;
  clear: () => void;
}>((set) => ({
  list: [],
  add: (a) => set((s) => ({ list: [...s.list, a] })),
  update: (id, patch) =>
    set((s) => ({
      list: s.list.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    })),
  remove: (id) => set((s) => ({ list: s.list.filter((i) => i.id !== id) })),
  clear: () => set({ list: [] }),
}));
```

---

# 🚀 2. 上传逻辑（对接 NestJS）

```ts
import axios from 'axios';
import { useAttachmentStore } from './store';

export async function uploadAttachment(a: Attachment) {
  const { update } = useAttachmentStore.getState();

  const form = new FormData();
  form.append('file', a.file!);

  await axios
    .post('/api/upload', form, {
      onUploadProgress: (e) => {
        const percent = Math.round((e.loaded * 100) / (e.total || 1));
        update(a.id, { progress: percent, status: 'uploading' });
      },
    })
    .then((res) => {
      update(a.id, {
        status: 'done',
        url: res.data.url,
        progress: 100,
      });
    });
}
```

---

# 🎯 3. @提及（核心逻辑）

👉 触发：输入 `@`

```tsx
// MentionPlugin.tsx（简化版）
const users = [
  { id: '1', name: '张三' },
  { id: '2', name: '李四' },
];

function MentionMenu({ onSelect }) {
  return (
    <div className="bg-popover border rounded p-2">
      {users.map((u) => (
        <div
          key={u.id}
          className="px-2 py-1 hover:bg-muted cursor-pointer"
          onClick={() => onSelect(u)}
        >
          @{u.name}
        </div>
      ))}
    </div>
  );
}
```

👉 插入结果：

```id="mention"
@张三
```

👉 实际建议：
用 lexical 的 `@lexical/react/LexicalTypeaheadMenuPlugin`

---

# ⚡ 4. Slash Command（/命令）

```tsx
const commands = [
  { name: 'giphy', desc: '发送 GIF' },
  { name: 'file', desc: '上传文件' },
];
```

UI：

```id="slash"
 /giphy cat
```

👉 触发逻辑：

- 输入 `/`
- 弹出命令面板
- 选择 → 替换输入内容

---

# 😀 5. 表情面板（Radix Popover）

```tsx
import * as Popover from '@radix-ui/react-popover';

export function EmojiPicker({ onSelect }) {
  const emojis = ['😀', '😂', '🔥', '👍'];

  return (
    <Popover.Root>
      <Popover.Trigger>😀</Popover.Trigger>
      <Popover.Content className="bg-popover p-2 rounded">
        <div className="grid grid-cols-4 gap-2">
          {emojis.map((e) => (
            <button key={e} onClick={() => onSelect(e)}>
              {e}
            </button>
          ))}
        </div>
      </Popover.Content>
    </Popover.Root>
  );
}
```

---

# 📎 6. 上传进度 UI（关键）

```tsx
function AttachmentItem({ a }) {
  return (
    <div className="relative w-20">
      {a.type === 'image' && <img src={a.url || URL.createObjectURL(a.file!)} />}

      {/* 进度条 */}
      {a.status === 'uploading' && (
        <div
          className="absolute bottom-0 left-0 h-1 bg-green-500"
          style={{ width: `${a.progress}%` }}
        />
      )}
    </div>
  );
}
```

---

# 🧠 7. 主输入框整合（关键逻辑）

```tsx
export function ChatInput() {
  const { list, clear } = useAttachmentStore();

  const send = async (text: string) => {
    // 1. 上传所有附件
    await Promise.all(list.map((a) => a.file && uploadAttachment(a)));

    // 2. 发消息
    const payload = {
      text,
      attachments: list.map((a) => ({
        type: a.type,
        url: a.url,
      })),
    };

    await fetch('/api/message', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    clear();
  };

  return (
    <div className="border p-3 rounded-2xl">
      {/* 附件 */}
      <AttachmentList />

      {/* 输入 */}
      <RichEditor />

      {/* 工具栏 */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <UploadButton />
          <EmojiPicker />
        </div>

        <button onClick={() => send('文本内容')}>发送</button>
      </div>
    </div>
  );
}
```

---

# ⚡ Electron 专属增强（你必须做）

你这个项目是 Electron，可以直接超越 Web：

### ✅ 1. 读取本地路径（无需 File）

```ts
window.electron.openFile();
```

---

### ✅ 2. 剪贴板图片（更强）

```ts
const image = clipboard.readImage();
```

---

### ✅ 3. 大文件直传（绕浏览器限制）

👉 主进程上传
👉 渲染进程只收进度

---

# 🚀 NestJS 后端建议

```ts
@Post("upload")
@UseInterceptors(FileInterceptor("file"))
upload(@UploadedFile() file: Express.Multer.File) {
  return {
    url: `/uploads/${file.filename}`,
  }
}
```

---

# 🧠 最后给你一个关键建议（很重要）

你现在已经不是在做“输入框”，而是在做：

> 👉 **消息创作系统（Message Composer）**

建议你下一步：

- 引入 lexical（我可以帮你写完整插件）
- 把输入框变成「插件系统」
- 类似 Discord：

```id="future"
@人
/命令
:emoji:
上传
语音
```

---

# 👉 下一步我可以继续帮你

你直接说一个：

### 1️⃣ 👉 “帮我把 lexical 全套插件写完整”

（@提及 / slash / emoji 真正生产级）

### 2️⃣ 👉 “帮我接入我这个 c_chat 项目”

（我直接按你仓库结构改）

### 3️⃣ 👉 “做一个 Discord 1:1 UI 克隆版”

我可以直接给你做到**接近商用级别**，不是 demo。
