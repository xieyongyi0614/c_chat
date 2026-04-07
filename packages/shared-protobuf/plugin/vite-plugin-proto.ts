import { exec } from 'child_process';
import { promises as fs } from 'fs';
import { resolve, join, dirname } from 'path';
import { Plugin } from 'vite';

export interface ProtoMergePluginOptions {
  /**
   * 包含 .proto 文件的目录列表（相对项目根目录）
   * 例如:['src/static']
   */
  directories: string[];
  /**
   * 输出的 JavaScript 文件路径（相对项目根目录）
   * 例如: 'src/protobuf.js'
   */
  output: string;
}

/**
 * Vite 插件：在构建前自动生成 Protobuf 的 JS 模块和 TypeScript 声明文件
 *
 * 依赖全局或本地安装的 protobufjs CLI 工具 (pbjs / pbts)
 */
export function protoMergePlugin(options: ProtoMergePluginOptions): Plugin {
  const { directories, output } = options;
  const outputPath = resolve(output);
  const outputDtsPath = outputPath.replace(/\.js$/, '.d.ts');

  return {
    name: 'vite-plugin-proto-merge',

    async buildStart() {
      try {
        // 1. 收集所有 .proto 文件
        const protoFiles: string[] = [];
        for (const dir of directories) {
          const resolvedDir = resolve(dir);
          const files = await fs.readdir(resolvedDir);
          for (const file of files) {
            if (file.endsWith('.proto')) {
              protoFiles.push(join(resolvedDir, file));
            }
          }
        }

        if (protoFiles.length === 0) {
          console.warn('[proto] ⚠️ 没有找到 .proto 文件', directories);
          return;
        }

        // 2. 检查是否需要更新
        const shouldUpdate = await checkShouldUpdate(protoFiles, outputPath);
        if (!shouldUpdate) {
          console.log('[proto] 🟢 无需重新生成');
          return;
        }

        // 3. 确保输出目录存在
        await fs.mkdir(dirname(outputPath), { recursive: true });

        // 4. 执行 pbjs 生成 JS
        await runCommand(
          `pbjs -t static-module -w commonjs -o ${JSON.stringify(outputPath)} ${protoFiles.map((f) => JSON.stringify(f)).join(' ')}`,
        );
        console.log(`[proto] ✅ 生成 JS: ${outputPath}`);

        // 5. 执行 pbts 生成 .d.ts
        await runCommand(`pbts -o ${JSON.stringify(outputDtsPath)} ${JSON.stringify(outputPath)}`);
        console.log(`[proto] ✅ 生成 .d.ts: ${outputDtsPath}`);
      } catch (error) {
        console.error('[proto] ❌ 生成失败:', error);
        // 注意：Vite 插件中抛出错误会中断构建
        throw error;
      }
    },
  };
}

/**
 * 检查是否需要重新生成（基于文件修改时间）
 */
const checkShouldUpdate = async (protoFiles: string[], outputPath: string): Promise<boolean> => {
  try {
    const outputStat = await fs.stat(outputPath);
    const outputMtimeMs = outputStat.mtimeMs;

    for (const file of protoFiles) {
      const stat = await fs.stat(file);
      if (stat.mtimeMs > outputMtimeMs) {
        return true;
      }
    }
    return false;
  } catch {
    // 如果输出文件不存在，也需要生成
    return true;
  }
};

/**
 * 执行 shell 命令（Promise 封装）
 */
const runCommand = (command: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        const msg = `[proto] Command failed:\n${command}\nstderr: ${stderr}`;
        reject(new Error(msg));
      } else {
        resolve(stdout);
      }
    });
  });
};
