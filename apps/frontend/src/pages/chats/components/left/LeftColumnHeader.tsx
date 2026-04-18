import { Button, cn } from '@c_chat/ui';
import { Edit, MessagesSquare, SearchIcon } from 'lucide-react';
import { memo } from 'react';
interface LeftColumnHeaderProps {
  search: string;
  onSearchChange: (search: string) => void;
  openCreateConversationDialog: (open: boolean) => void;
}

const LeftColumnHeader = (props: LeftColumnHeaderProps) => {
  const { search, onSearchChange, openCreateConversationDialog } = props;
  return (
    <div className="sticky top-0 z-10 -mx-4 bg-background px-4 pb-3 shadow-md sm:static sm:z-auto sm:mx-0 sm:p-0 sm:shadow-none">
      <div className="flex items-center justify-between py-2">
        <div className="flex gap-2">
          <h1 className="text-2xl font-bold">消息</h1>
          <MessagesSquare size={20} />
        </div>

        <Button
          size="icon"
          variant="ghost"
          onClick={() => openCreateConversationDialog(true)}
          className="rounded-lg"
        >
          <Edit size={24} className="stroke-muted-foreground" />
        </Button>
      </div>

      <label
        className={cn(
          'focus-within:ring-1 focus-within:ring-ring focus-within:outline-hidden',
          'flex h-10 w-full items-center space-x-0 rounded-md border border-border ps-2',
        )}
      >
        <SearchIcon size={15} className="me-2 stroke-slate-500" />
        <span className="sr-only">Search</span>
        <input
          type="text"
          className="w-full flex-1 bg-inherit text-sm focus-visible:outline-hidden"
          placeholder="Search chat..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </label>
    </div>
  );
};
export default memo(LeftColumnHeader);
