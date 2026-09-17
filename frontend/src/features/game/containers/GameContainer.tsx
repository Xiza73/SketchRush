import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';

import { PALETTE } from '@/shared/contract';
import { useSessionStore } from '@/core/session/stores/useSessionStore';
import { useLobbyStore } from '@/features/lobby/stores/useLobbyStore';
import { ReactionOverlay } from '@/features/reactions/components/ReactionOverlay';
import { ReactionPicker } from '@/features/reactions/components/ReactionPicker';
import { useResultsStore } from '@/features/results/stores/useResultsStore';
import { PageLoading } from '@/shared/components/ui/PageState';
import { useNow } from '@/shared/hooks/useNow';
import { useVisualViewport } from '@/shared/hooks/useVisualViewport';
import { useT } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { resultsPath } from '@/shared/routes/paths';
import { toast } from '@/shared/stores/useToastStore';

import { useChooseWord } from '../api/choose-word/useChooseWord';
import { useDraw } from '../api/draw/useDraw';
import { useSubmitGuess } from '../api/submit-guess/useSubmitGuess';
import { CanvasToolbar } from '../components/CanvasToolbar';
import { DrawingCanvas, type CanvasTool } from '../components/DrawingCanvas';
import { ScorePreviewCard } from '../components/ScorePreviewCard';
import {
  drawerPreview,
  guesserPreview,
  settledGuesserPreview,
  type ScorePreview,
} from '../models/score-preview.model';
import { GuessPanel } from '../components/GuessPanel';
import { PlayersPanel, type PanelPlayer } from '../components/PlayersPanel';
import { TurnHeader } from '../components/TurnHeader';
import { WordChoices } from '../components/WordChoices';
import { useDrawShortcuts } from '../hooks/useDrawShortcuts';
import { useTurnStore } from '../stores/useTurnStore';

interface GameContainerProps {
  roomCode: string;
}

export const GameContainer = ({ roomCode }: GameContainerProps) => {
  const t = useT();
  const navigate = useNavigate();

  const turn = useTurnStore((state) => state.turn);
  const ops = useTurnStore((state) => state.ops);
  const generation = useTurnStore((state) => state.generation);
  const choices = useTurnStore((state) => state.choices);
  const feed = useTurnStore((state) => state.feed);
  const iGuessed = useTurnStore((state) => state.iGuessed);
  const canRedo = useTurnStore((state) => state.undone.length > 0);

  const lobby = useLobbyStore((state) => state.lobby);
  const standings = useResultsStore((state) => state.roundEnd?.standings ?? null);
  const roomStatus = useResultsStore((state) => state.roomStatus);
  const myId = useSessionStore((state) => state.session?.playerId ?? null);

  const [tool, setTool] = useState<CanvasTool>('brush');
  const [color, setColor] = useState(PALETTE[0] ?? '#1c1a17');
  const [size, setSize] = useState(10);

  const { chooseWord, pending: choosing } = useChooseWord();
  const { sendStroke, sendShape, sendFill, sendUndo, sendRedo, sendClear } = useDraw();
  const { submitGuess, pending: guessing } = useSubmitGuess();

  // The turn is over: the reveal and the table live on the results screen.
  useEffect(() => {
    if (roomStatus === 'between-turns' || roomStatus === 'finished') {
      navigate(resultsPath(roomCode), { replace: true });
    }
  }, [roomStatus, roomCode, navigate]);

  const iAmDrawer = turn !== null && turn.drawerId === myId;
  const drawing = turn !== null && !turn.choosing;
  // Only the clock on screen needs the frame loop; nothing is counting between turns.
  const now = useNow(200, turn !== null);
  const viewport = useVisualViewport();

  // Set from here rather than inside the hook: the top bar folds away on the
  // game screen alone, and the lobby's inputs have all the room they need.
  useEffect(() => {
    const root = document.documentElement;
    if (viewport.keyboardOpen) root.dataset.keyboard = 'open';
    else delete root.dataset.keyboard;
    return () => {
      delete root.dataset.keyboard;
    };
  }, [viewport.keyboardOpen]);

  useDrawShortcuts({ enabled: iAmDrawer && drawing, onUndo: sendUndo, onRedo: sendRedo });

  const secondsLeft = turn && turn.deadlineAt > 0 ? Math.max(0, (turn.deadlineAt - now) / 1000) : 0;
  const chooseSecondsLeft = choices ? Math.max(0, (choices.deadline - now) / 1000) : 0;

  const nameOf = useMemo(() => {
    const names = new Map(lobby?.players.map((player) => [player.id, player.name]) ?? []);
    return (playerId: string) => names.get(playerId) ?? '—';
  }, [lobby]);

  const players = useMemo<PanelPlayer[]>(() => {
    if (!turn || !lobby) return [];
    const totals = new Map(standings?.map((row) => [row.playerId, row.total]) ?? []);
    const byId = new Map(turn.players.map((player) => [player.playerId, player]));
    const seats = new Map(lobby.players.map((player) => [player.id, player]));
    // The server's drawing order, not the lobby's join order: the panel is the
    // running order, so it has to be listed in the order it will actually run.
    // Anybody in the lobby but not in the order joined after the game started
    // and has no turn of their own; they go last.
    const drawingAt = turn.order.indexOf(turn.drawerId);
    const ordered = [
      ...turn.order.filter((id) => seats.has(id)),
      ...lobby.players.filter((player) => !turn.order.includes(player.id)).map((p) => p.id),
    ];

    return ordered.map((id, index) => {
      const seat = seats.get(id)!;
      const state = byId.get(id);
      const place = turn.order.indexOf(id);
      return {
        playerId: id,
        guessed: state?.guessed ?? false,
        position: state?.position ?? null,
        points: state?.points ?? 0,
        name: seat.name,
        connected: seat.connected,
        isMe: id === myId,
        isDrawer: id === turn.drawerId,
        total: totals.get(id) ?? 0,
        turnPosition: index + 1,
        drawnThisRound: place >= 0 && drawingAt >= 0 && place < drawingAt,
      };
    });
  }, [turn, lobby, standings, myId]);

  // What the turn pays if it ended right now. Recomputed on every clock frame
  // for a guesser, because the falling number *is* the point being made.
  const preview = useMemo<ScorePreview | null>(() => {
    if (!turn || turn.choosing) return null;
    if (turn.drawerId === myId) return drawerPreview(turn.drawerId, turn.players);
    const mine = turn.players.find((player) => player.playerId === myId);
    return mine?.guessed
      ? settledGuesserPreview(mine)
      : guesserPreview(secondsLeft, turn.drawSeconds, turn.players);
  }, [turn, myId, secondsLeft]);

  if (!turn || !lobby) return <PageLoading title={t.game.turnStarting} />;

  const onGuess = async (text: string) => {
    const result = await submitGuess(text);
    if (!result.ok) {
      toast.error(result.error.code);
      return { correct: false, close: false };
    }
    const { correct, close } = result.value;
    // Written to my own feed only, so a `box` room still shows me what I have
    // already tried without showing anybody else a thing.
    useTurnStore.getState().noteMyGuess(text, correct ? 'correct' : close ? 'close' : 'wrong');
    return { correct, close };
  };

  return (
    <div
      // What the page can actually see, handed down to whoever needs to fit
      // inside it. `--canvas-reserve` is everything on screen that is not the
      // drawing; with a keyboard up the panels below are gone, so the drawing
      // gets their share and the letters, the sheet and the box all survive on
      // a phone. The desktop grid never reaches either rule.
      style={
        {
          '--app-vh': `${viewport.height}px`,
          '--canvas-reserve': viewport.keyboardOpen ? '11rem' : '19rem',
        } as CSSProperties
      }
      className="game-screen grid flex-1 grid-cols-1 gap-4 px-4 py-4 sm:px-7 lg:grid-cols-[240px_minmax(0,1fr)_320px]"
    >
      {/* On a phone the guess box comes straight after the canvas: it is the one
          control that has to be in reach, and the table can wait below it. */}
      <aside
        className={cn(
          'order-3 flex flex-col gap-2.5 lg:order-1',
          // Neither of these is worth a line of the screen while somebody is
          // typing against a clock, and between them they are most of it.
          viewport.keyboardOpen && 'hidden lg:flex',
        )}
      >
        {preview && <ScorePreviewCard t={t} preview={preview} settled={iGuessed} />}
        <PlayersPanel players={players} />
      </aside>

      <main className="order-1 flex min-h-0 min-w-0 flex-col gap-2.5 lg:order-2">
        <TurnHeader
          round={turn.round}
          totalRounds={turn.totalRounds}
          secondsLeft={secondsLeft}
          drawSeconds={turn.drawSeconds}
          drawerName={nameOf(turn.drawerId)}
          iAmDrawer={iAmDrawer}
          masked={turn.masked}
          word={turn.word}
          choosing={turn.choosing}
          action={<ReactionPicker />}
        />

        <div className="relative">
          <DrawingCanvas
            ops={ops}
            generation={generation}
            interactive={iAmDrawer && drawing}
            tool={tool}
            color={color}
            size={size}
            onStroke={sendStroke}
            onShape={sendShape}
            onFill={sendFill}
            label={iAmDrawer ? t.game.canvasYours : t.game.canvasTheirs(nameOf(turn.drawerId))}
          />
          <ReactionOverlay nameOf={nameOf} className="absolute inset-x-0 bottom-0" />
        </div>

        {iAmDrawer && (
          <CanvasToolbar
            tool={tool}
            color={color}
            size={size}
            disabled={!drawing}
            onTool={setTool}
            onColor={setColor}
            onSize={setSize}
            onUndo={sendUndo}
            onRedo={sendRedo}
            canRedo={canRedo}
            onClear={sendClear}
          />
        )}
      </main>

      <aside className="order-2 flex min-h-0 flex-col lg:order-3">
        <GuessPanel
          mode={lobby.settings.guessMode}
          // The feed is the first thing to go when the screen shrinks: it is
          // history, and the drawing in front of you is not.
          compact={viewport.keyboardOpen}
          feed={feed}
          nameOf={nameOf}
          canGuess={!iAmDrawer && drawing && !iGuessed}
          iGuessed={iGuessed}
          iAmDrawer={iAmDrawer}
          pending={guessing}
          onGuess={onGuess}
        />
      </aside>

      {iAmDrawer && choices !== null && (
        <WordChoices
          choices={choices.choices}
          secondsLeft={chooseSecondsLeft}
          pending={choosing}
          onChoose={(index) => void chooseWord(index)}
        />
      )}
    </div>
  );
};
