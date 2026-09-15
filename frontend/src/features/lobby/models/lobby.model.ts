import type { LobbyState, RoomSettings, RoomStatus } from '@/shared/contract';

export interface LobbyPlayerViewModel {
  id: string;
  name: string;
  isHost: boolean;
  ready: boolean;
  connected: boolean;
  isMe: boolean;
}

export interface LobbyViewModel {
  code: string;
  status: RoomStatus;
  settings: RoomSettings;
  players: LobbyPlayerViewModel[];
  hostName: string;
  isHost: boolean;
  me: LobbyPlayerViewModel | null;
  readyCount: number;
  playerCount: number;
}

export const toLobbyViewModel = (dto: LobbyState, myId: string | null): LobbyViewModel => {
  const players = dto.players.map((player) => ({
    id: player.id,
    name: player.name,
    isHost: player.isHost,
    ready: player.ready,
    connected: player.connected,
    isMe: player.id === myId,
  }));
  const me = players.find((player) => player.isMe) ?? null;
  return {
    code: dto.code,
    status: dto.status,
    settings: dto.settings,
    players,
    hostName: players.find((player) => player.isHost)?.name ?? '',
    isHost: me?.isHost ?? false,
    me,
    readyCount: players.filter((player) => player.ready).length,
    playerCount: players.length,
  };
};
