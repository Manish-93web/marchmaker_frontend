import { CommandPalette as Palette, type PaletteCommand } from '@marchmaker/ui';
import { useNavigate } from 'react-router-dom';

export type Command = PaletteCommand;

/** Cmd/Ctrl+K: jump anywhere, or search members for whatever you type. The widget itself lives in the shared UI package. */
export function CommandPalette({ commands, open, onClose }: { commands: Command[]; open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  return (
    <Palette
      open={open}
      onClose={onClose}
      commands={commands}
      placeholder="Go to… or search members"
      empty="No matches"
      extra={(q) => ({ id: 'search-members', label: `Search members for “${q}”`, hint: 'Members', run: () => nav(`/members?q=${encodeURIComponent(q)}`) })}
    />
  );
}
