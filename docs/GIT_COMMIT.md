## 提交规范 (Conventional Commits)

1. 格式

```
<type>: <subject>
[可选正文]
[可选页脚]
```

2. 类型（`type`）

| 类型     | 含义             | 示例                                                  |
| :------- | :--------------- | :---------------------------------------------------- |
| feat     | ✨ 新增功能      | `feat(auth): 添加用户登录功能`                        |
| fix      | 🐛 修复 Bug      | `fix(header): 修复标题栏拖拽失效问题`                 |
| docs     | 📝 文档变更      | `docs(readme): 更新安装步骤`                          |
| style    | 💄 代码格式调整  | `style(card): 移除多余的空格` (不影响逻辑)            |
| refactor | ♻️ 代码重构      | `refactor(utils): 优化日期处理函数` (非新功能非修bug) |
| perf     | ⚡️ 性能优化     | `perf(list): 优化长列表渲染速度`                      |
| test     | ✅ 测试相关      | `test(login): 添加登录失败用例`                       |
| chore    | 🔧 构建/工具变动 | `chore(deps): 升级 react 版本`                        |
| ci       | 👷 CI/CD 配置    | `ci(github): 修改 action 流程`                        |

3. Scope (可选) - 影响范围
   括号内的内容，表示这次修改影响的模块。
   例如：feat(**card**): ... (只改了卡片组件)
   例如：fix(**titlebar**): ... (只改了标题栏)
   如果不确定或影响全局，可以省略。
4. Subject (必填) - 简短描述
   使用祈使句（现在时），不要说 "Added" 或 "Fixes"，要说 "Add" 或 "Fix"。
   首字母小写（英文习惯），结尾不加句号。
   中文描述即可，清晰明了。

#### 💡 优秀 vs 糟糕的提交示例

| ❌ 糟糕的提交             | ✅ 优秀的提交                                | 原因                             |
| :------------------------ | :------------------------------------------- | :------------------------------- |
| `fix bug`                 | `fix(titlebar): 修复 Windows 下拖拽延迟问题` | 明确了类型、范围和具体问题。     |
| `update card style`       | `style(card): 移除边框并调整阴影`            | 描述了具体改了什么样式。         |
| `finished the login page` | `feat(auth): 完成登录页面 UI 和表单验证`     | 使用了正确的动词和范围。         |
| `wip` (Work In Progress)  | `feat(dashboard): [WIP] 初步搭建仪表盘布局`  | 即使是半成品，也要说明做了什么。 |

#### 🛠️ 如何自动化强制执行？

1. Commitizen / Cz-git: 提交时弹出交互式菜单，让你选类型、填内容，自动生成规范格式。

```bash
npm install -g commitizen cz-git
# 然后运行 git cz 代替 git commit
```

2. Commitlint + Husky: 在 git commit 时自动拦截，如果格式不对直接报错拒绝提交。

```bash
# 安装
npm install --save-dev @commitlint/config-conventional @commitlint/cli husky
```

```typescript
# 配置 commitlint.config.js
import type { UserConfig } from '@commitlint/types';

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {},
} satisfies UserConfig;
```

```bash
# 启用 husky
npx husky install
npx husky init
```
