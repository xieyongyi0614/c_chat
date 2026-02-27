import { useState } from 'react';

type TabType = 'message' | 'contacts' | 'favorites' | 'settings';

type Props = {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
};

const tabs = [
  { id: 'message', icon: '💬', label: '消息' },
  { id: 'contacts', icon: '👥', label: '通讯录' },
  { id: 'favorites', icon: '⭐', label: '收藏' },
  { id: 'settings', icon: '⚙️', label: '设置' },
] as const;

export function LeftSidebar({ activeTab, onTabChange }: Props) {
  return (
    <aside className="flex w-16 flex-col items-center border-r border-surface-200/10 bg-gradient-to-b from-surface-800/60 via-surface-900 to-surface-900/95 py-4">
      <div className="flex flex-1 flex-col items-center gap-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id as TabType)}
            className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-primary-500/20 text-primary-400 scale-105'
                : 'text-surface-400 hover:bg-surface-800/70 hover:text-surface-200'
            }`}
            title={tab.label}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 用户头像区域 */}
      <div className="mt-auto">
        <button className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary-300 to-primary-500 text-sm font-semibold text-surface-900 hover:opacity-90 transition-opacity">
          我
        </button>
      </div>
    </aside>
  );
}
