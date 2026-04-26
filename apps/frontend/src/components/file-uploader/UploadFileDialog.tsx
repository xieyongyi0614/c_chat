import { useState } from 'react';

function createIpcMessage(method: string, params: any[] = []) {
  return {
    method,
    params,
    id: `${method}_${Date.now()}_${Math.random().toString(16).slice(2)}`,
  };
}

export function UploadFileDialog() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [status, setStatus] = useState<string>('');

  const selectFiles = async () => {
    setStatus('正在打开文件选择对话框...');
    try {
      const result = await window.c_chat?.ipcCall(
        createIpcMessage('SelectUploadFiles', [{ allowMultiSelect: false }]),
      );
      if (Array.isArray(result)) {
        setSelectedFiles(result);
        setStatus(result.length ? `已选择 ${result.length} 个文件` : '未选择文件');
      } else {
        setStatus('文件选择已取消');
      }
    } catch (error) {
      setStatus(`选择文件失败: ${error}`);
    }
  };

  const uploadSelectedFile = async () => {
    if (!selectedFiles.length) {
      setStatus('请先选择文件');
      return;
    }

    const filePath = selectedFiles[0];
    setStatus('开始分片上传...');

    try {
      const result = await window.c_chat?.ipcCall(
        createIpcMessage('UploadFileByChunks', [
          {
            filePath,
            chunkSize: 1024 * 1024 * 2,
            description: '来自 Electron 渲染进程的分片上传',
          },
        ]),
      );

      setStatus(`上传完成，文件名: ${result?.fileName ?? filePath}`);
    } catch (error) {
      setStatus(`上传失败: ${error}`);
    }
  };

  return (
    <div className="upload-file-dialog">
      <button type="button" onClick={selectFiles}>
        选择文件
      </button>
      <button type="button" onClick={uploadSelectedFile} disabled={!selectedFiles.length}>
        上传文件
      </button>
      <div>{selectedFiles.join(', ') || '未选择文件'}</div>
      <div>{status}</div>
    </div>
  );
}
